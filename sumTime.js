const moment = require('moment');

function sumTime(timeArr) {
    let totalTime = moment('00:00:00', 'HH:mm:ss')

    timeArr.forEach(time => {
        time = time.replaceAll(/[hms]/g, '');
        time = time.replaceAll(/\s/g, ':');

        totalTime.add(time, 'HH:mm:ss');
    })

    totalTime = totalTime.format('HH:mm:ss');
    totalTime = totalTime.slice(0, 2) +'h ' + totalTime.slice(3, 5) +'m ' + totalTime.slice(6, 8) +'s ';
    
    return totalTime;
}

module.exports = sumTime;