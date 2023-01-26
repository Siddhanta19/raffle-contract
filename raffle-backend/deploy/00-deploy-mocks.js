const { developmentChains } = require("../helper-hardhat-config");

const BASE_FEE = ethers.utils.parseEther("0.25"); // 0.25 is the premium. It consts 0.5 link.
const GAS_PRICE_LINK = 1e9; // 1000000000 //link per gas. calculated value based  on the gas price of the chain

// Eth price $1,000,000,000
// ChainLink Nodes pay the gas fees to give us randomness *& do external execution

module.exports = async function ({ getNamedAccounts, deployments }) {
	const { deploy, log } = deployments;
	const { deployer } = await getNamedAccounts();
	const chainId = network.config.chainId;

	if (developmentChains.includes(network.name)) {
		log("Local Network Detected! Deploying mocks...");
		// deploy a mock
		await deploy("VRFCoordinatorV2Mock", {
			from: deployer,
			log: true,
			args: [BASE_FEE, GAS_PRICE_LINK],
		});
		log("Mocks Deployed!");
		log("----------------------------------------------------------------");
	}
};

module.exports.tags = ["all", "mocks"];
