// have a function to enter the lottery
import { ethers } from "ethers";
import { useMoralis, useWeb3Contract } from "react-moralis";
import { abi, contractAddresses } from "../constants";
import { useEffect } from "react";
import { useState } from "react";
import { useNotification, Button, Loading } from "web3uikit";

export default function LotteryEntrance() {
	const { chainId: chainIdHex, isWeb3Enabled } = useMoralis();

	// contract function call data
	const [entranceFee, setEntranceFee] = useState("0");
	const [numPlayers, setNumPlayers] = useState("0");
	const [recentWinner, setRecentWinner] = useState("0");

	const dispatch = useNotification();

	const chainId = parseInt(chainIdHex);
	const raffleAddress =
		chainId in contractAddresses ? contractAddresses[chainId][0] : null;

	const {
		runContractFunction: enterRaffle,
		isFetching,
		isLoading,
	} = useWeb3Contract({
		abi: abi,
		contractAddress: raffleAddress, //specify the networkId
		functionName: "enterRaffle",
		params: {},
		msgValue: entranceFee,
	});
	const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
		abi: abi,
		contractAddress: raffleAddress, //specify the networkId
		functionName: "getNumberOfPlayers",
		params: {},
	});
	const { runContractFunction: getRecentWinner } = useWeb3Contract({
		abi: abi,
		contractAddress: raffleAddress, //specify the networkId
		functionName: "getRecentWinner",
		params: {},
	});

	const { runContractFunction: getEntranceFee } = useWeb3Contract({
		abi: abi,
		contractAddress: raffleAddress, //specify the networkId
		functionName: "getEntranceFee",
		params: {},
	});

	async function updateUI() {
		const getEntranceFeeFromCall = (await getEntranceFee()).toString();
		const getNumPlayersFromCall = (await getNumberOfPlayers()).toString();
		const getRecentWinnerFromCall = (await getRecentWinner()).toString();
		console.log(getRecentWinnerFromCall);
		setEntranceFee(getEntranceFeeFromCall);
		setNumPlayers(getNumPlayersFromCall);
		setRecentWinner(getRecentWinnerFromCall);
	}

	/* useEffect(() => {
		(async function () {
			web3.once("WinnerPicked", async () => {
				updateUI();
			});
		})();
	}, []); */

	useEffect(() => {
		if (isWeb3Enabled) {
			// try to read the raffle entrance fee.
			updateUI();
		}
	}, [isWeb3Enabled]);

	const handleSuccess = async function (tx) {
		// wait for the transaction to completewwwwwwwwwwwwww
		await tx.wait(1);
		handleNewNotification();
		updateUI();
	};
	const handleNewNotification = function () {
		dispatch({
			type: "success",
			message: "Transaction Completed!",
			title: "Tx Notification!",
			position: "topR",
		});
	};

	return (
		<div>
			{raffleAddress ? (
				<div className="p-6 flex flex-col md:flex-row items-center justify-center space-y-6 md:space-y-0 md:space-x-6 sm:p-8 border-b-8 border-blue-100">
					<Button
						color="blue"
						size="large"
						text={
							isLoading || isFetching ? (
								<div
									style={{
										backgroundColor: "#ECECFE",
										display: "flex",
										alignItems: "center",
										justifyContent: "center",
										width: "100px",
										height: "30px",
									}}>
									<Loading spinnerColor="rgb(46 125 175)" />
								</div>
							) : (
								<div className="text-lg">Enter Raffle</div>
							)
						}
						disabled={isLoading || isFetching}
						theme="colored"
						className=""
						onClick={async () => {
							await enterRaffle({
								onSuccess: handleSuccess,
								onError: (error) => console.log(error),
							});
						}}></Button>
					<div className="text-lg">
						Entrance Fee -{" "}
						<span className="font-semibold">
							{ethers.utils.formatUnits(entranceFee, "ether")} ETH
						</span>
					</div>
					<div className="text-lg">
						No. of Players -<span className="font-semibold"> {numPlayers}</span>
					</div>
					<div className="text-lg">
						Recent Winner -{" "}
						<span className="font-semibold">
							{recentWinner.slice(0, 4)}...
							{recentWinner.slice(recentWinner.length - 4)}
						</span>
					</div>
				</div>
			) : (
				<div className="text-lg p-6 font-semibold text-center border-b-8 border-blue-100">
					No Raffle Address Detected.
				</div>
			)}
		</div>
	);
}
