"use strict"
const vscode = require('vscode');
const { newDB, getRow, updateDB, oldInstall } = require('./database')

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
let time = '00h 00m 00s';			
let date = new Date;
let mainInstance = true;
let instanceID = String(Math.random().toFixed(10)).slice(2);

function activate(context) {
	
	newDB()
	.then(res => {
		if(res.dbReady) {

			//Add new instance and check if an instance stopped running

			getRow('instance-data')
			.then(res => {
				// Create properties if they don't exist
				if(!res.instanceStatus) {
					res.instanceStatus = {};
				}
				
				if(!res.instances) {
					res.instances = {};
				}
				
				if(!res.lastInstance) {
					res.lastInstance = 0;
				}
		
				// Checks if lastInstance time has more than 1.5 second without being updated
				if(res.lastInstance - Date.now() < -1500) {
					res.lastInstance = 0;
					res.instanceStatus = {};
					res.instances = {};
					updateDB(res, 'instance-data');
				}
				
				res.instanceStatus[instanceID] = (vscode.window.state.focused) ? 'focused' : 'unfocused';

				let activeInstances = Object.keys(res.instances).length;
				if(activeInstances >= 1) {
					mainInstance = false;
				}	

				// Updates each instance current time
				setInterval(()=>{
					getRow('instance-data')
					.then(res => {
						res.instances[instanceID] = Date.now();
						res.lastInstance = Date.now();
						updateDB(res, 'instance-data');
					})
					
				}, 500)

				//Check if an instance has been terminated
				setInterval(() => {
					getRow('instance-data')
					.then(res => {

						for(let instance in res.instances) {
							if(res.instances[instance] - Date.now() < -2000) {
								delete res.instances[instance];
								delete res.instanceStatus[instance];
								updateDB(res, 'instance-data');
							}
						}
						
					}) 
				}, 1500)
			})
	
			myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 2);
			myStatusBarItem.text = '00h 00m 00s';
			
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
			let runOnStartup = vscode.workspace.getConfiguration('chronus').get('runOnStartup');
			

			let focusState;

			//Get current instance window state and store in the DB;
			function focusPolling() {
				return setInterval(() => {
					getRow('instance-data')
					.then(res => {
						res.instanceStatus[instanceID] = (vscode.window.state.focused) ? "focused" : "unfocused";
						updateDB(res, 'instance-data');
						focusState = Object.values(res.instanceStatus);
					})
				}, 100)
			}

			// Check if window focus changed
			function windowListener() {
				return setInterval(() => {
					// let event = vscode.window.state.focused;
					let pause = !focusState.includes('focused');
					if(mainInstance) {
						if(timerIsRunning && pause) {
							vscode.commands.executeCommand("chronus.pauseTimer")
						}
						if(!pause && !timerIsRunning) {
							vscode.commands.executeCommand("chronus.startTimer");
						}
						
					}

				}, 300)
			}
		
			//Instantiate window listener if pauseWhenUnfocus === true;
			let listener;
			let focusPollingInterval;

			if(pauseWhenUnfocused) {
				listener = windowListener();
				focusPollingInterval = focusPolling();
			}
		
			function setCurrentDate() {
				currentDate = {"day":date.getDate(), "month": date.getMonth() + 1, "year":date.getFullYear()}
				dateTemplate = `${(currentDate.day < 10) ? '0' : ''}${currentDate.day}/${(currentDate.month < 10) ? '0' : ''}${currentDate.month}/${currentDate.year}`;
				
				getRow('time-records')
				.then(res => {
					if(res[dateTemplate] === undefined) {
						res[dateTemplate] = [];
					}
		
					if(runOnStartup) {
						res[dateTemplate].push('00h 00m 00s');
						session = res[dateTemplate].length;
					}

					updateDB(res, 'time-records');

				})
				.catch(err => {
					console.log(err);
				})
			}
			setCurrentDate();
			
			//Set current-time.currentTime to initial value;
			getRow('current-time')
			.then(res => {
				res.currentTime = '00h 00m 00s';
				updateDB(res, 'current-time');
			})
		
			// Functions
			
			let startTimer = vscode.commands.registerCommand('chronus.startTimer', function () {

				let removeCount = 0;		
				timerIsRunning = true;
				if(!pauseWhenUnfocused) {
					changeButtonCommand("chronus.pauseTimer");
				}
				else {
					changeButtonCommand("chronus.pausePTWU");
				}
				
				getRow('time-records')
				.then(res => {
					if(!runOnStartup && !timerReset) {
						res[dateTemplate].push('00h 00m 00s');
						session = res[dateTemplate].length;
						updateDB(res, 'time-records');
					}
				})

				timer = setInterval(() => {
					// Update time on DB
					getRow('time-records')
					.then(res => {
						if(timerReset) {
							res[dateTemplate].push('00h 00m 00s');
							session = res[dateTemplate].length;
							timerReset = false;
						}
						
						res[dateTemplate][session - 1] = time;
		
						if(mainInstance) {
							updateDB(res, 'time-records');
						}
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
			
						getRow('current-time')
						.then(res =>{
							res.currentTime = time;
							if(mainInstance) {
								updateDB(res, 'current-time')
							}
						})
		
						if(mainInstance) {
							updateStatusBar(time, '$(debug-pause)', "Pause");
						}
						else {
							getRow('current-time')
							.then(res=> {
								updateStatusBar(res.currentTime, '$(debug-pause)');
								changeButtonCommand(undefined);
							})
		
							if(removeCount === 0) {
								getRow('time-records')
								.then(res => {
									res[dateTemplate].pop();
									updateDB(res, 'time-records');
									removeCount++;						
								})
							}
						}
			
						seconds += 1;	
					}
				}, 1000)
			});
		
			let pauseTimer = vscode.commands.registerCommand('chronus.pauseTimer', function() {
				if(!mainInstance) {
					return;
				}
				timerIsRunning = false;
				updateStatusBar(time, '$(debug-start)', "Start");
				clearInterval(timer);

				if(!pauseWhenUnfocused) {
					changeButtonCommand("chronus.startTimer");
				}
				else {
					changeButtonCommand("chronus.startPTWU");
				}
			})
		
			let resetTimer = vscode.commands.registerCommand('chronus.resetTimer', function() {
				if(!mainInstance) {
					return;
				}
				hours = minutes = seconds = 0;
				time = '00h 00m 00s';
				vscode.commands.executeCommand('chronus.pauseTimer');
				timerReset = true;
			})
		
			let showTimerLog = vscode.commands.registerCommand('chronus.showTimerLog', function() {
				let webViewElement = vscode.window.createWebviewPanel('string', 'Chronus', vscode.ViewColumn.One)

				webViewElement.iconPath = {
						dark: vscode.Uri.joinPath(context.extensionUri, 'images', 'timer.png'),
						light: vscode.Uri.joinPath(context.extensionUri, 'images', 'timer-dark.png'),
				};
		
				getRow('time-records')
				.then(res => {
					let keys = Object.keys(res);
		
					let htmlContent = `	<main>
										<h1>Summary</h1>`;
		
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
							htmlContent += `</details>`
						}
						
					});
					htmlContent += `
					<style>
						@import url('https://fonts.googleapis.com/css2?family=Signika:wght@300..700&display=swap');

						main {
							background-color: #292929;
							display: flex;
							flex-direction: column;
							align-items:center;
							border-radius: 15px;
							padding:10px;
							margin-top: 5px;
							transition: height 100ms ease-out;
							box-shadow: 5px 5px 20px #1c1c1c;
							max-width: 700px;
							margin-left: auto;
							margin-right: auto;
						}

						div {
							position: relative;
							width: 100%;
						}

						details {
							position: relative;
							font-family:Signika, Garamond;
							width: 100%;
							border-radius: 15px;
							margin-top: 5px;
						}
						
						details[open] {
							background-color: #303030;
							padding-bottom: 15px;
							margin-top: 5px;
						}

						details[open] > summary {
							list-style-type: '';
							background-color: #303030;
						}
						
						details[open] > summary::after {
							transform: rotate(225deg);
						}

						h1 {
							font-size:28px; 
							color: white;
							margin-top: 0;
							margin-bottom: 10px;
							user-select: none;
						}

						li {
							font-size:18px;
							font-weight:400;
							color:white;
						}

						summary {
							position: relative;
							font-size:28px; 
							font-weight:600;
							user-select: none;
							transition: ease-out 150ms;
							color:white;
							list-style-type: '';
							width:100%;
							height: 60px;
							display: flex;
							align-items: center;
							border-radius: 15px;
							text-indent: 15px;
						}
						
						summary::after {
							transform: rotate(45deg);
							transition: 200ms ease-in-out;
							content: "";
							position:absolute;
							right: 20px;
							height:20px;
							width:20px;
							background-color: white;
							clip-path: polygon(50% 0%,65.00% 0.00%,65.00% 65.00%,1.00% 65.00%,0% 50%,50% 50%);								}

						summary:hover {
							cursor:pointer;
							background-color: #303030;

						}

					</style>
					</main>`;
					
					webViewElement.webview.html = htmlContent;
					webViewElement.reveal();
					
				})
			})
		
			let resetLogs = vscode.commands.registerCommand('chronus.resetLogs', async function() {
				if(mainInstance) {
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
					}
				}})
			
			let showMoreOptions = vscode.commands.registerCommand('chronus.showMoreOptions', function() {
				vscode.window.showInformationMessage(' Select an option:', 'Show Timer Logs', 
				'Reset Timer', 'Clear Timer Logs')
				.then(res => {
					if(res === 'Show Timer Logs') {
						vscode.commands.executeCommand('chronus.showTimerLog')
					}
					else if(res === 'Clear Timer Logs') {
						vscode.commands.executeCommand('chronus.resetLogs')
					}
					else if(res === 'Reset Timer') {
						vscode.commands.executeCommand('chronus.resetTimer')
					}
				})

			})
			
			//PTWU = pauseTimerWhenUnfocused
			let startPTWU = vscode.commands.registerCommand('chronus.startPTWU', function() {
				vscode.commands.executeCommand('chronus.startTimer');
				listener = windowListener();
				focusPollingInterval = focusPolling();
				changeButtonCommand('chronus.pausePTWU');
			})

			let pausePTWU = vscode.commands.registerCommand('chronus.pausePTWU', function() {
				vscode.commands.executeCommand('chronus.pauseTimer');
				clearInterval(listener)
				clearInterval(focusPollingInterval)
				changeButtonCommand('chronus.startPTWU');
			})

			if(!runOnStartup && mainInstance) {
				time = '00h 00m 00s';
				updateStatusBar(time, '$(debug-start)', "Start");
				changeButtonCommand("chronus.startTimer");
			}
			
			if(runOnStartup) {
				vscode.commands.executeCommand("chronus.startTimer");
			}
				
			// Create new window listener || Delete window listener: When pauseWhenUnfocused change
			vscode.workspace.onDidChangeConfiguration(() => {
				pauseWhenUnfocused = vscode.workspace.getConfiguration('chronus').get('pauseTimerWhenUnfocused');
				if(pauseWhenUnfocused && !listener) {
					listener = windowListener();
					focusPollingInterval = focusPolling();

					if(timerIsRunning) {
						changeButtonCommand('chronus.pausePTWU');
					}
					else {
						changeButtonCommand('chronus.startPTWU');
					}
				}
		
				if(!pauseWhenUnfocused){
					clearInterval(listener);
					clearInterval(focusPollingInterval);
					listener = undefined;

					if(timerIsRunning) {
						changeButtonCommand("chronus.startTimer");
					}
					else {
						changeButtonCommand("chronus.startTimer");
					}
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
			context.subscriptions.push(startPTWU);
			context.subscriptions.push(pausePTWU);

			}
			})
			.catch(err => {
				console.error(err);
			})
}

function updateStatusBar(time, icon='$(debug-pause)', tooltipText) {
	if(mainInstance) {
		myStatusBarItem.text = `${icon} ${time}`;
		myStatusBarItem.show();
		myStatusBarItem.tooltip = (tooltipText) ? `Click To ${tooltipText}` : undefined;
		myStatusBarItem.accessibilityInfomation = time;
	}
	else {
		myStatusBarItem.text = time;
		myStatusBarItem.tooltip = '';
		myStatusBarItem.show();
	}
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