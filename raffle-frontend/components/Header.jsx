import { ConnectButton } from "web3uikit";

export default function Header() {
	return (
		<div className="flex justify-between items-center p-6 sm:p-8 bg-blue-100">
			<h1 className="text-3xl font-semibold">Dec-Raffle</h1>
			<ConnectButton moralisAuth={false} />
		</div>
	);
}
