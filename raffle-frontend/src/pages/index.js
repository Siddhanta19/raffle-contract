import Head from "next/head";
// import ManualHeader from "../../components/ManualHeader";
import Image from "next/image";
import { Inter } from "@next/font/google";
import styles from "@/styles/Home.module.css";
import Header from "components/Header";
import LotteryEntrance from "components/LotteryEntrance";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
	return (
		<>
			<Head>
				<title>Smart Contract Raffle</title>
				<meta name="description" content="Our Smart Contract Raffle" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>
			{/* header / connect button / nav bar */}
			{/* <ManualHeader /> */}
			<Header />
			<LotteryEntrance />
		</>
	);
}
