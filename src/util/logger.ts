import chalk, { ChalkInstance } from "chalk";

export class Logger {
  private prefix: string;
  constructor(private name: string) {
    this.prefix = chalk.gray(`[${name}] `);
  }

  log(...message: unknown[]) {
    console.log(`${this.prefix}${message}`);
  }

  success(message: string) {
    console.log(`${this.prefix}${chalk.green(message)}`);
  }

  error(message: string) {
    console.log(`${this.prefix}${chalk.red(message)}`);
  }
}
