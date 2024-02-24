import sqlite3 from "sqlite3";
import { open } from "sqlite";

let db;

const getDb = async () => {
    if (!db){
        db = await open({
            filename: 'database.db',
            driver: sqlite3.Database
        })
        await db.exec(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, tgId INTEGER, username TEXT, name TEXT, ban BOOLEAN
        )`);
        await db.exec(`CREATE TABLE IF NOT EXISTS newsletter (
            id INTEGER, photo TEXT, caption TEXT
        )`);

        // await db.run('INSERT INTO newsletter (id) VALUES (1)');
        // await db.run('INSERT INTO newsletter (id) VALUES (2)');
        
    }
    // await db.run (
    //     'INSERT INTO users (tgId) VALUES (?)',
    //     2222
    // )
    // const res = await db.get('SELECT * FROM users WHERE tgId = 6579632461');
    // console.log(res.tgId);
    return db;
    
};

export{getDb}