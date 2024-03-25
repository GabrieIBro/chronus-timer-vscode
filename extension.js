const vscode = require('vscode');


/**
 * @param {vscode.ExtensionContext} context
 */	
let myStatusBarItem;
let timerIsRunning = false;

let seconds = 0;
let minutes = 0;
let hours = 0;
let time;			
let date = new Date;

function activate(context) {

    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);

	let configuration = vscode.workspace.getConfiguration('code-timer');
	configuration.update("pauseTimerWhenUnfocused", true, vscode.ConfigurationTarget.Global);

	let pauseWhenUnfocused = configuration.get("pauseTimerWhenUnfocused");

	let currentDate = {"day":date.getDate(), "month": date.getMonth(), "year":date.getFullYear()}
	let dateTemplate = `${currentDate.day}/${currentDate.month}/${currentDate.year}`;

	// Verify if session count is already stored. If already stored, increment by 1 on every activate.
	let currentDateObj = context.globalState.get(dateTemplate) || {};
	if(!currentDateObj.sessions) {currentDateObj.sessions = 0}; 
	currentDateObj.sessions++;

	let session = currentDateObj.sessions;
	console.log(session)

	context.globalState.update(dateTemplate, {...currentDateObj});

	let startTimer = vscode.commands.registerCommand('code-timer.startTimer', function () {
		timerIsRunning = true;

		const timer = setInterval(() => {
			// console.log(context.globalState.f);
			let sessionList = context.globalState.get(dateTemplate) || {};
			sessionList[`Session ${session}`] = time;
			context.globalState.update(dateTemplate, {...sessionList})
			console.log(context.globalState.f)

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
	
				updateStatusBar(time, '$(debug-pause)', "code-timer.pauseTimer", "pause");
	
				seconds += 1;	
			}
			else {
				clearInterval(timer)
			}
		}, 1000)

	});

	let pauseTimer = vscode.commands.registerCommand('code-timer.pauseTimer', function() {
		timerIsRunning = false;
		updateStatusBar(time, '$(debug-start)', "code-timer.startTimer", "start");

	})

	let showTimerLog = vscode.commands.registerCommand('code-timer.showTimerLog', () => {
		let webViewElement = vscode.window.createWebviewPanel('string', 'Work Log', vscode.ViewColumn);
		webViewElement.webview.html = `<p>${time}</p>`;
		webViewElement.visible = true;
		
	})

	vscode.commands.executeCommand("code-timer.startTimer");

	if(pauseWhenUnfocused) {
		vscode.window.onDidChangeWindowState(event => {
			if(!event.focused) {
				vscode.commands.executeCommand("code-timer.pauseTimer")
			}

			if(event.focused && !timerIsRunning) {
				vscode.commands.executeCommand("code-timer.startTimer");
			}
		})
	}

	context.subscriptions.push(startTimer);
	context.subscriptions.push(pauseTimer);
	context.subscriptions.push(myStatusBarItem);
	context.subscriptions.push(showTimerLog);
}

function updateStatusBar(time, icon='$(debug-pause)', buttonCommand, tooltipText) {
	myStatusBarItem.text = `${icon} ${time}`;
	myStatusBarItem.show();
	myStatusBarItem.command = buttonCommand;
	myStatusBarItem.tooltip = `Click to ${tooltipText}`;
	myStatusBarItem.accessibilyInfomation = time;
}



function deactivate() {}

module.exports = {
	activate,
	deactivate
}