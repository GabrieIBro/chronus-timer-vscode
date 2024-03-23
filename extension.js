const vscode = require('vscode');

/**
 * @param {vscode.ExtensionContext} context
 */	
let myStatusBarItem;

function activate(context) {
    myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
    context.subscriptions.push(myStatusBarItem);

	let running = false;
	let seconds = 0;
	let minutes = 0;
	let hours = 0;

	let startTimer = vscode.commands.registerCommand('coding-time.startTimer', function () {
		let time;			
		running = true;
		
		const timer = setInterval(() => {
			
			if(running) {
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
	
				updateStatusBar(time)
	
				seconds += 1;			
			}
			else {
				clearInterval(timer)
			}
		}, 1000)

		context.subscriptions.push(startTimer);
	});

	let stopTimer = vscode.commands.registerCommand('coding-time.pauseTimer', function() {
		running = false;

		context.subscriptions.push(pauseTimer);
	})
}

function updateStatusBar(time) {
	myStatusBarItem.text = `$(debug-pause) ${time}`;
	myStatusBarItem.show();

}


function deactivate() {}

module.exports = {
	activate,
	deactivate
}
