const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const {
	developmentChains,
	networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
	? describe.skip
	: describe("Raffle Unit Tests", function () {
			let raffle,
				raffleContract,
				vrfCoordinatorV2Mock,
				raffleEntranceFee,
				interval,
				player;
			const chainId = network.config.chainId;

			beforeEach(async function () {
				accounts = await ethers.getSigners();
				player = accounts[1];
				await deployments.fixture(["mocks", "raffle"]);
				vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
				raffleContract = await ethers.getContract("Raffle");
				raffle = raffleContract.connect(player);
				raffleEntranceFee = await raffle.getEntranceFee();
				interval = await raffle.getInterval();
			});

			describe("constructor", function () {
				it("initializes the raffle correctly", async function () {
					// We make out tests have just 1 assert per "it"
					const raffleState = await raffle.getRaffleState();
					assert.equal(raffleState.toString(), "0");
					assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
				});
			});

			describe("enterRaffle", function () {
				it("reverts when you don't pay enough", async function () {
					await expect(raffle.enterRaffle()).to.be.revertedWith(
						"Raffle__NotEnoughETHEntered"
					);
				});
				it("records players when they enter", async function () {
					// all these func calls on raffle are done by the deployer
					await raffle.enterRaffle({ value: raffleEntranceFee });
					const playerFromContract = await raffle.getPlayer(0);
					assert.equal(player.address, playerFromContract);
				});
				it("emits event on enter", async function () {
					await expect(
						raffle.enterRaffle({ value: raffleEntranceFee })
					).to.emit(raffle, "RaffleEnter");
				});
				it("doesn't allow entrance when raffle is calculating", async function () {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.send("evm_mine", []);

					// We pretend to be a ChainLink Keeper
					await raffle.performUpkeep([]);
					await expect(
						raffle.enterRaffle({ value: raffleEntranceFee })
					).to.be.revertedWith("Raffle__NotOpen");
				});
			});

			describe("checkUpkeep", function () {
				it("returns false if people haven't sent any ETH", async function () {
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.send("evm_mine", []);
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
					assert(!upkeepNeeded);
				});

				it("returns false if raffle isn't open", async function () {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.send("evm_mine", []);
					await raffle.performUpkeep("0x");
					const raffleState = await raffle.getRaffleState();
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x");
					assert.equal(raffleState.toString(), "1");
					assert.equal(upkeepNeeded, false);
				});

				it("returns false if enough time hasn't passed", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() - 5,
					]); // use a higher number here if this test fails
					await network.provider.request({ method: "evm_mine", params: [] });
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
					assert(!upkeepNeeded);
				});

				it("returns true if enough time has passed, has players, eth, and is open", async () => {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.request({ method: "evm_mine", params: [] });
					const { upkeepNeeded } = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
					assert(upkeepNeeded);
				});
			});
			describe("performUpkeep", function () {
				it("It can only run if checkUpkeep is true", async function () {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.send("evm_mine", []);
					const tx = await raffle.performUpkeep([]);
					assert(tx);
				});
				it("reverts when checkUpkeep is false", async () => {
					await expect(raffle.performUpkeep([])).to.be.reverted;
				});
				it("updates the raffle state, emits an event, and call the vrfCoordinatorV2", async function () {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.send("evm_mine", []);
					const txResponse = await raffle.performUpkeep([]);
					const txReceipt = await txResponse.wait(1);
					const requestId = txReceipt.events[1].args.requestId;
					const raffleState = await raffle.getRaffleState();
					assert(requestId.toNumber() >= 0);
					assert(raffleState.toString() == "1");
				});
			});
			describe("fulfillRandomWords", function () {
				beforeEach(async function () {
					await raffle.enterRaffle({ value: raffleEntranceFee });
					await network.provider.send("evm_increaseTime", [
						interval.toNumber() + 1,
					]);
					await network.provider.send("evm_mine", []);
				});
				it("can only be called after performUpkeep", async function () {
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
					).to.be.revertedWith("nonexistent request");
					await expect(
						vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
					).to.be.revertedWith("nonexistent request");
				});
				// Wayyy to big
				it("picks a winner, resets the lottery, and sends money", async function () {
					const additionalEntrants = 3;
					const startingAccountIndex = 2; // deployer = 0
					const accounts = await ethers.getSigners();
					for (
						let i = startingAccountIndex;
						i < startingAccountIndex + additionalEntrants;
						i++
					) {
						raffle = raffleContract.connect(accounts[i]);
						await raffle.enterRaffle({
							value: raffleEntranceFee,
						});
					}

					const startingTimeStamp = await raffle.getLatestTimestamp();

					// perform upkeep (mock being chainLink keepers)
					// fulfilRandomWords (mock being the chainlink vrf)
					// We will have to wait for the fulfilRandomWords to be called
					await new Promise(async (resolve, reject) => {
						raffle.once("WinnerPicked", async () => {
							console.log("WinnerPicked Event fired!");
							try {
								const recentWinner = await raffle.getRecentWinner();
								const endingTimeStamp = await raffle.getLatestTimestamp();
								const raffleState = await raffle.getRaffleState();
								const numPlayers = await raffle.getNumberOfPlayers();
								const winnerEndingBalance = await accounts[2].getBalance();

								// console.log(`recentWinner: ${recentWinner}`);
								// console.log(accounts[0].address);
								// console.log(accounts[1].address);
								// console.log(accounts[2].address);
								// console.log(accounts[3].address);
								// console.log(startingTimeStamp);
								// console.log(endingTimeStamp);

								assert.equal(numPlayers.toString(), "0");
								assert.equal(raffleState.toString(), "0");
								expect(endingTimeStamp > startingTimeStamp);
								assert.equal(
									winnerEndingBalance.toString(),
									winnerStartingBalance
										.add(
											raffleEntranceFee
												.mul(additionalEntrants)
												.add(raffleEntranceFee)
										)
										.toString()
								);
								resolve();
							} catch (err) {
								reject(err);
							}
						});
						// once the fulfilRandomWords func gets called, a winner Picked event will be emitted which will be caugh by the listener
						/* Right after this transaction is called, the callback func above gets fired. */
						const tx = await raffle.performUpkeep([]);
						const txReceipt = await tx.wait(1);
						const winnerStartingBalance = await accounts[2].getBalance();
						await vrfCoordinatorV2Mock.fulfillRandomWords(
							txReceipt.events[1].args.requestId,
							raffle.address
						);
					});
				});
			});
	  });
