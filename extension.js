const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */	
let myStatusBarItem;

function activate(context) {
    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
    context.subscriptions.push(myStatusBarItem);

	let timerIsRunning = false;

	let seconds = 0;
	let minutes = 0;
	let hours = 0;
	let time;			

	
	let startTimer = vscode.commands.registerCommand('code-timer.startTimer', function () {
		timerIsRunning = true;
		
		const timer = setInterval(() => {
			
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

		context.subscriptions.push(startTimer);
	});


	let pauseTimer = vscode.commands.registerCommand('code-timer.pauseTimer', function() {
		timerIsRunning = false;
		updateStatusBar(time, '$(debug-start)', "code-timer.startTimer", "start");

		context.subscriptions.push(pauseTimer);
	})

	vscode.commands.executeCommand("code-timer.startTimer");
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