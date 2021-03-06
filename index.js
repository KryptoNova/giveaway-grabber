#! /usr/bin/env node

const puppeteer = require('puppeteer');
const findUp = require('find-up');
const fs = require('fs');
const { enterGiveaways } = require('./src/giveaways');
const signIn = require('./src/signIn');

//look for config file
const configPath = findUp.sync(['.ggrc.json']);
const config = configPath ? JSON.parse(fs.readFileSync(configPath)) : undefined;

//set up CLI
const args = require('yargs')
	.scriptName('gg')
	.command(require('./src/init'))
	.describe('page', 'page to start script on')
	.number('page')
	.describe('config', 'path to JSON config file')
	.string('config')
	.config(config)
	.help().argv;

if (args._[0] === 'init') {
	return;
}

const username = args.username;
const password = args.password;
if (!username || !password) {
	console.error(
		'Missing required username and/or password! Did you run `gg init`?'
	);
	return;
}

//add args to process.env to be used elsewhere if needed
process.env.AMAZON_USERNAME = username;
process.env.AMAZON_PASSWORD = password;
if (args.blacklist && args.blacklist !== '') {
	process.env.BLACKLIST = args.blacklist;
}
if (args.sendgrid_api_key && args.sendgrid_api_key !== '') {
	process.env.SENDGRID_API_KEY = args.sendgrid_api_key;
}
if (args.sendgrid_cc && args.sendgrid_cc !== '') {
	process.env.SENDGRID_CC = args.sendgrid_cc;
}

//start index code
(async () => {
	let config = {
		headless: false,
		args: ['--mute-audio']
	};
	if (args['remember_me']) {
		config.userDataDir = './user_data';
	}
	const browser = await puppeteer.launch(config);
	const page = await browser.newPage();

	let pageNumber = 1;
	if (args.page) {
		pageNumber = args.page;
	}

	//sign in
	await signIn(
		page,
		username,
		password,
		pageNumber,
		args['2FA'],
		args['remember_me']
	);

	//enter giveaways
	await enterGiveaways(page, args.page || 1);

	await browser.close();
})();
