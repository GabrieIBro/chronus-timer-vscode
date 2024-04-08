const os = require('os');
const sqlite3 = require('sqlite3').verbose();

let stateLocation = {
	"linux":"/.config/Code/User/globalStorage/timer.db",
	"mac": "/Library/Application\ Support/Code/User/globalStorage/timer.db",
	"windows": "\\AppData\\Roaming\\Code\\User\\globalStorage\\timer.db"
}
let filePath = process.env.HOME;

if(os.platform() === 'linux') {
    filePath += stateLocation.linux;
}
else if(os.platform() === 'darwin') {
    filePath += stateLocation.mac
}
else if(os.platform() === 'win32') {
    filePath += stateLocation.windows
}

function newDB() {
    let sql;
    let db = new sqlite3.Database(filePath, sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE, (err) => {
        if(err) {console.error(err.message)}
    })

    db.serialize(() => {
        sql = `CREATE TABLE IF NOT EXISTS chronus(
            name TEXT PRIMARY KEY,
            value TEXT
        )`;

        db.run(sql, (err) => {
            if(err) {console.error(err.message)}
        })  

        sql = `INSERT OR IGNORE INTO chronus(name, value) VALUES ('chronus-data', '{}')`;

        db.run(sql, err => {
            if(err) {console.error(err.message)}
        })

        db.close();
        })
}

function getDB() {
    let data;
    let sql = `SELECT * FROM chronus WHERE name='chronus-data'`;
    let db = new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE, (err) => {
        if(err) {console.error(err.message)}
    });

    return new Promise((resolve,reject) => {
        db.get(sql, (err, row) => {
            if(err){
                reject(err.message);
            }

            else {
                data = JSON.parse(row.value);
                resolve(data);
            }
        })
        db.close();
    })
}

function updateDB(obj) {
    obj = JSON.stringify(obj);
    let sql = `UPDATE chronus SET value=? WHERE name='chronus-data'`
    let db = new sqlite3.Database(filePath, sqlite3.OPEN_READWRITE, (err) => {
        if(err) {console.error(err.message);}
    })

    db.run(sql, [obj], (err) => {
        if(err) {console.error(err.message);}
    })

    db.close();
}

module.exports = {
    newDB,
    getDB,
    updateDB
}