const vscode = require('vscode');
const { newDB, getDB, updateDB } = require('./database')

/**
 * @param {vscode.ExtensionContext} context
 */	
let myStatusBarItem;
let timerIsRunning = false;

let timer;
let seconds = 0;
let minutes = 0;
let hours = 0;
let time;			
let date = new Date;
let isMain = false;

function activate(context) {

    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);

	newDB();
	let configuration;
	let pauseWhenUnfocused;

	let currentDate = {"day":date.getDate(), "month": date.getMonth() + 1, "year":date.getFullYear()}
	let dateTemplate = `${(currentDate.day < 10) ? '0' : ''}${currentDate.day}/${(currentDate.month < 10) ? '0' : ''}${currentDate.month}/${currentDate.year}`;
	let session;

	getDB()
	.then(res => {
		if(res[dateTemplate] === undefined) {
			res[dateTemplate] = [];
		}

		res[dateTemplate].push('00h 00m 00s');
		session = res[dateTemplate].length;
		updateDB(res)
	})
	.catch(err => {
		console.log(err);
	})


	//Add new instance and check if an instance stopped running

	// context.globalState.update('31/3/2024', undefined);

	// let instances = context.globalState.get('instances') || {};
	
	// let instanceID = String(Math.random().toFixed(10)).slice(2);

	// let lastInstance = context.globalState.get('lastInstance') || 0;

	// if(lastInstance - Date.now() < -5000) {
	// 	console.log("Clean Instances")
	// 	// modifyDB(false, true);
	// }

	// setInterval(()=>{
	// 	instances[instanceID] = Date.now();
	// 	context.globalState.update('instances', instances);
	// 	context.globalState.update('lastInstance', Date.now());
	// }, 1000)
	
	// let instancesLength = Object.keys(instances);

	// if(instancesLength === 1) {
	// 	isMain = true;
	// }



	// Functions
	
	let startTimer = vscode.commands.registerCommand('chronus.startTimer', function () {
		timerIsRunning = true;
		changeButtonCommand("chronus.pauseTimer");

		timer = setInterval(() => {
			// Update time on DB
			getDB()
			.then(res => {
				// if(!res[dateTemplate]) {
				// 	res[dateTemplate] =('00h 00m 00s');
				// }

				res[dateTemplate][session - 1] = time;
				updateDB(res);
			})
			.catch(err => {
				console.log(err);
			})


			// Get current date
			if(date.getDate() !== currentDate.day) {
				currentDate = {"day":date.getDate(), "month": date.getMonth(), "year":date.getFullYear()}
				seconds = minutes = hours = 0;
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
	
				updateStatusBar(time, '$(debug-pause)', "pause");
	
				seconds += 1;	
			}

		}, 1000)

	});

	let pauseTimer = vscode.commands.registerCommand('chronus.pauseTimer', function() {
		timerIsRunning = false;
		updateStatusBar(time, '$(debug-start)', "start");
		changeButtonCommand("chronus.startTimer");
		clearInterval(timer);
	})

	let showTimerLog = vscode.commands.registerCommand('chronus.showTimerLog', function() {
		let webViewElement = vscode.window.createWebviewPanel('string', 'Work Log', vscode.ViewColumn.One);

		getDB()
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
			webViewElement.visible = true;
			

		})
	})

	let resetLogs = vscode.commands.registerCommand('chronus.resetLogs', async function() {
		time = '00h 00m 00s';
		hours = minutes = seconds = 0;
		vscode.commands.executeCommand('chronus.pauseTimer');

		let reload = await vscode.window.showWarningMessage(
			'This function will reload the workspace. Do you want to proceed?',
			{ modal: true },
			'Reload'
		);
		
		if(reload) {
					getDB()
		.then(res => {
			let keys = Object.keys(res);

			keys.forEach(key => {
				if(key.includes('/')) {
					delete res[key];
				}
			})
			updateDB(res);
			vscode.commands.executeCommand('workbench.action.reloadWindow');
		})
		}
	})

	
	let resetTimer = vscode.commands.registerCommand('chronus.resetTimer', function() {
		hours = minutes = seconds = 0;
		time
	})


	vscode.commands.executeCommand("chronus.startTimer");
	vscode.workspace.onDidChangeConfiguration(() => {
		configuration = vscode.workspace.getConfiguration('chronus');
		pauseWhenUnfocused = configuration.get("pauseTimerWhenUnfocused");	
		console.log('pauseWhenUnfocused: ' + pauseWhenUnfocused);			
	});

	let listener = vscode.window.onDidChangeWindowState((event) => {
		if(pauseWhenUnfocused) {
			if(!event.focused && timerIsRunning) {
				vscode.commands.executeCommand("chronus.pauseTimer")
			}
			else if(event.focused && !timerIsRunning) {
				vscode.commands.executeCommand("chronus.startTimer");
			}
		}
		else {
			listener.dispose();
		}
	})
	
	context.subscriptions.push(startTimer);
	context.subscriptions.push(pauseTimer);
	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(showTimerLog);
	context.subscriptions.push(resetTimer);
	context.subscriptions.push(resetLogs);

}

function updateStatusBar(time, icon='$(debug-pause)', tooltipText) {
	myStatusBarItem.text = `${icon} ${time}`;
	myStatusBarItem.show();
	myStatusBarItem.tooltip = `Click to ${tooltipText}`;
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