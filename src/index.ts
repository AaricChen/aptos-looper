#! /usr/bin/env node

import colors from "ansicolor";
import { APTOS_COIN, AptosAccount, AptosClient } from "aptos";
import BigNumber from "bignumber.js";
import { Command } from "commander";
import { textSync } from "figlet";
import fs from "fs";
import nodemailer from "nodemailer";
import { description, name, version } from "../package.json";

const NODE_URL = "https://fullnode.mainnet.aptoslabs.com";
const TARGE_FILE = "accounts.csv";

interface Account {
  key: string;
  balance: number;
}

new Command()
  .version(version)
  .description(description)
  .option("-m, --email <value>", "Notification email", "")
  .option("-u, --user <value>", "Email service username", "")
  .option("-p, --pass <value>", "Email service password", "")
  .action(async (options) => {
    console.log(textSync(name));
    console.log(version);
    const email = options.email;
    const emailServiceUser = options.user;
    const emailServicePass = options.pass;
    const aptosClient = new AptosClient(NODE_URL);
    const transporter = nodemailer.createTransport({
      host: "smtp.qq.com",
      port: 465,
      secure: true,
      auth: {
        user: emailServiceUser,
        pass: emailServicePass,
      },
    });
    let currentCount = 0;
    let targetCount = 0;
    while (true) {
      ++currentCount;
      const result = await verifyAccount(
        currentCount,
        targetCount,
        aptosClient,
        async (account) => {
          if (email) {
            transporter.sendMail({
              from: `Aptos Looper <${emailServiceUser}>`,
              to: email,
              subject: `Find target with balance ${account.balance}`,
              text: account.key,
            });
          }
        }
      );
      if (result) {
        targetCount++;
      }
    }
  })
  .parse(process.argv);

async function verifyAccount(
  current: number,
  target: number,
  client: AptosClient,
  onTarget: (target: Account) => Promise<void>
): Promise<boolean> {
  const account = new AptosAccount();
  console.log(
    target > 0 ? colors.green(`[${target}]`) : colors.dim("[0]"),
    colors.dim(`[${current}]`),
    colors.dim(`${account.address().hex()}`)
  );
  try {
    const resources = await client.getAccountResources(account.address());
    const balanceResource = resources.find(
      (it) => it.type === `0x1::coin::CoinStore<${APTOS_COIN}>`
    );
    if (balanceResource) {
      const balance = (balanceResource as any).data.coin.value;
      const amount = BigNumber(balance).div(BigNumber(10).pow(8));

      if (amount.gt(0)) {
        const target: Account = {
          key: account.toPrivateKeyObject().privateKeyHex,
          balance: amount.toNumber(),
        };
        fs.appendFileSync(TARGE_FILE, `${target.key},${target.balance}\n`);
        console.log(colors.yellow(target.key), colors.green(target.balance));
        onTarget(target);
        return true;
      }
    }
  } catch (e) {
    const error = String(e);
    if (!error.includes("Account not found by Address")) {
      console.log(colors.dim(error));
    }
  }
  return false;
}
