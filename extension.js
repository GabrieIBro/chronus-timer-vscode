"use strict"
const vscode = require('vscode');
const { newDB, getDB, updateDB } = require('./database')

/**
 * @param {vscode.ExtensionContext} context
 */	
let myStatusBarItem;
let statusBarMore;
let timerIsRunning = false;

let timer;
let seconds = 0;
let minutes = 0;
let hours = 0;
let time;			
let date = new Date;
let mainInstance = false;

function activate(context) {

	newDB();
    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 2);

	statusBarMore = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
	statusBarMore.text = `$(settings)`;
	statusBarMore.tooltip = 'Chronus: More Options';
	statusBarMore.command = 'chronus.showMoreOptions';
	statusBarMore.show();

	let timerReset = false;
	let session;
	let dateTemplate;
	let currentDate;
	let pauseWhenUnfocused = vscode.workspace.getConfiguration('chronus').get('pauseTimerWhenUnfocused');

	// Check if window focus changed
	function windowListener() {
		return vscode.window.onDidChangeWindowState((event) => {
			if(!event.focused && timerIsRunning) {
				vscode.commands.executeCommand("chronus.pauseTimer")
			}
			else if(event.focused && !timerIsRunning) {
				vscode.commands.executeCommand("chronus.startTimer");
			}
		})
	}

	//Instantiate window listener if pauseWhenUnfocus === true;
	let listener;

	if(pauseWhenUnfocused) {
		listener = windowListener()
		// console.log('Initial Window Listener');
	}

	function setCurrentDate() {
		currentDate = {"day":date.getDate(), "month": date.getMonth() + 1, "year":date.getFullYear()}
		dateTemplate = `${(currentDate.day < 10) ? '0' : ''}${currentDate.day}/${(currentDate.month < 10) ? '0' : ''}${currentDate.month}/${currentDate.year}`;
		
		getDB('time-records')
		.then(res => {
			if(res[dateTemplate] === undefined) {
				res[dateTemplate] = [];
			}

			res[dateTemplate].push('00h 00m 00s');
			session = res[dateTemplate].length;
			updateDB(res, 'time-records');
			// console.log(res);
		})
		.catch(err => {
			console.log(err);
		})
	}
	setCurrentDate();

	//Add new instance and check if an instance stopped running

	getDB('instance-data')
	.then(res => {
		if(!res.instances) {
			res.instances = {};
		}
		
		if(!res.lastInstance) {
			res.lastInstance = 0;
		}

		let instanceID = String(Math.random().toFixed(10)).slice(2);

		if(res.lastInstance - Date.now() < -2000) {
			console.log(res);
			res.lastInstance = 0;
			res.instances = {};
			console.log("Clean Instances")
		}


		setInterval(()=>{
			res.instances[instanceID] = Date.now();
			res.lastInstance = Date.now();

			let activeInstances = Object.keys(res.instances).length;
			if(activeInstances === 1) {
				mainInstance = true;
			}	
			
			vscode.window.showInformationMessage(`Main Instance: ${mainInstance}\tActive Instances: ${Object.keys(res.instances)}`);

			updateDB(res, 'instance-data');
		}, 1000)
	})

	// Functions
	
	let startTimer = vscode.commands.registerCommand('chronus.startTimer', function () {
		timerIsRunning = true;
		changeButtonCommand("chronus.pauseTimer");

		timer = setInterval(() => {
			// Update time on DB
			getDB('time-records')
			.then(res => {
				if(timerReset) {
					res[dateTemplate].push('00h 00m 00s');
					session = res[dateTemplate].length;
					timerReset = false;
				}

				res[dateTemplate][session - 1] = time;
				updateDB(res, 'time-records');
			})
			.catch(err => {
				console.log(err);
			})

			// Update current date
			if(date.getDate() !== currentDate.day) {
				hours = minutes = seconds = 0;
				setCurrentDate();
			}

			if(timerIsRunning) {
				
				if(seconds === 60){
					minutes++;
					seconds = 0;
				}
		
				if(minutes === 60){
					hours++;
					minutes = 0;
				}
		
				time = (((hours < 10) ? '0' : '') + hours + 'h ') 
					+  (((minutes < 10) ? '0' : '') + minutes + 'm ') 
					+  (((seconds < 10) ? '0' : '') + seconds + 's');
	
				updateStatusBar(time, '$(debug-pause)', "Pause");
	
				seconds += 1;	
			}
		}, 1000)

	});

	let pauseTimer = vscode.commands.registerCommand('chronus.pauseTimer', function() {
		timerIsRunning = false;
		updateStatusBar(time, '$(debug-start)', "Start");
		changeButtonCommand("chronus.startTimer");
		clearInterval(timer);
	})

	let resetTimer = vscode.commands.registerCommand('chronus.resetTimer', function() {
		hours = minutes = seconds = 0;
		time = '00h 00m 00s';
		vscode.commands.executeCommand('chronus.pauseTimer');
		timerReset = true;
	})

	let showTimerLog = vscode.commands.registerCommand('chronus.showTimerLog', function() {
		let webViewElement = vscode.window.createWebviewPanel('string', 'Work Log', vscode.ViewColumn.One);

		getDB('time-records')
		.then(res => {
			let keys = Object.keys(res);

			let htmlContent = "";

			keys.forEach(key => {

				if(key.includes('/')) {
					htmlContent += `
					<details>
						<summary>${[key]}</summary>
									`;

					res[key].forEach((el, index) => {
						htmlContent += `
							<ul><li>Session ${[index + 1]}: ${[el]}</li></ul>
										`;
					})
					htmlContent += `
					<style>
						@import url('https://fonts.googleapis.com/css2?family=Signika:wght@300..700&display=swap');

						details {
							font-family:Signika, Garamond;
						}

						li {
							font-size:18px;
							font-weight:400;
							color:white;
						}

						summary {
							font-size:28px; 
							font-weight:600;
							user-select: none;
							transition: ease-out 150ms;
							color:white;
						}

						summary:hover {
							cursor:pointer;
							color: #bababa;

						}

					</style>
					</details>`;
				}
				
			});

			webViewElement.webview.html = htmlContent;
			webViewElement.reveal();
			

		})
	})

	let resetLogs = vscode.commands.registerCommand('chronus.resetLogs', async function() {
		let reload = await vscode.window.showWarningMessage(
			"To proceed with deleting all records from Chronus, click 'Confirm'.",
			{ modal: true },
			'Confirm'
		);
		
		if(reload) {
			time = '00h 00m 00s';
			hours = minutes = seconds = 0;
			vscode.commands.executeCommand('chronus.pauseTimer');
			
			updateDB({}, 'time-records');
			vscode.commands.executeCommand('workbench.action.reloadWindow');
	    }})

	let showMoreOptions = vscode.commands.registerCommand('chronus.showMoreOptions', () => {
		let webViewElement = vscode.window.createWebviewPanel();
	})

	vscode.commands.executeCommand("chronus.startTimer");
	
	// Create new window listener || Delete window listener: When pauseWhenUnfocused change
	vscode.workspace.onDidChangeConfiguration(() => {
		pauseWhenUnfocused = vscode.workspace.getConfiguration('chronus').get('pauseTimerWhenUnfocused');
		if(pauseWhenUnfocused && !listener) {
			listener = windowListener();
			// console.log('New Window Listener');
		}

		if(!pauseWhenUnfocused){
			listener.dispose();
			listener = undefined;
			// console.log('Dispose');
		}
	});
	

	context.subscriptions.push(startTimer);
	context.subscriptions.push(pauseTimer);
	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(statusBarMore);
	context.subscriptions.push(showTimerLog);
	context.subscriptions.push(resetTimer);
	context.subscriptions.push(resetLogs);
	context.subscriptions.push(showMoreOptions);

}

function updateStatusBar(time, icon='$(debug-pause)', tooltipText) {
	myStatusBarItem.text = `${icon} ${time}`;
	myStatusBarItem.show();
	myStatusBarItem.tooltip = `Click To ${tooltipText}`;
	myStatusBarItem.accessibilityInfomation = time;
}

function changeButtonCommand(buttonCommand) {
	myStatusBarItem.command = undefined;
	setTimeout(() => {
		myStatusBarItem.command = buttonCommand;
	}, 100)
}

function deactivate() {}

module.exports = {
	activate,
	deactivate
}