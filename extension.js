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

	let configuration;
	let pauseWhenUnfocused;

	let currentDate = {"day":date.getDate(), "month": date.getMonth(), "year":date.getFullYear()}
	let dateTemplate = `${currentDate.day}/${currentDate.month}/${currentDate.year}`;


	let currentDateArray = context.globalState.get(dateTemplate) || [];
	currentDateArray.push('Placeholder');
	context.globalState.update(dateTemplate, [...currentDateArray]);
 
	let session = currentDateArray.length;
	
	let startTimer = vscode.commands.registerCommand('code-timer.startTimer', function () {
		timerIsRunning = true;

		const timer = setInterval(() => {
			let sessionList = context.globalState.get(dateTemplate) || [];
			sessionList[session - 1] = time;

			context.globalState.update(dateTemplate, [...sessionList])

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

	let showTimerLog = vscode.commands.registerCommand('code-timer.showTimerLog', function() {
		let webViewElement = vscode.window.createWebviewPanel('string', 'Work Log', vscode.ViewColumn);

		let keys = context.globalState.keys();
		let htmlContent = "";

		keys.forEach(key => {
			htmlContent += `
			<div>
				<h1>${[key]}</h1>
			</div>
							`
			context.globalState.get(key).forEach((el, index) => {
				htmlContent += `
				<div>
					<ul><li>Session ${[index + 1]}: ${[el]}</li></ul>
				</div>
								`
			})
		});

		webViewElement.webview.html = htmlContent;
		webViewElement.visible = true;
		
	})

	vscode.commands.executeCommand("code-timer.startTimer");

	vscode.workspace.onDidChangeConfiguration(() => {
		configuration = vscode.workspace.getConfiguration('code-timer');
		pauseWhenUnfocused = configuration.get("pauseTimerWhenUnfocused");
		let listener;

		listener = vscode.window.onDidChangeWindowState((event) => {
			if(pauseWhenUnfocused) {

				if(!event.focused) {
					vscode.commands.executeCommand("code-timer.pauseTimer")
				}
				if(event.focused && !timerIsRunning) {
					vscode.commands.executeCommand("code-timer.startTimer");
				}
			}
			else {
				listener.dispose();
			}
		})
	})

	
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