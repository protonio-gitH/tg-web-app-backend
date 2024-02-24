export async function createUser(db,tgId,username,name,ban ){
    try{
        let create = await db.run('INSERT INTO users (tgId,username,name,ban) VALUES (?, ?, ?, ?)',tgId,username,name,ban);
        return create;
    }catch(e){
        console.error(e);
    }    
}

export async function checkUserName(db,currentUserName,chatId){
    try{
        let check = await db.get('SELECT username FROM users WHERE tgId = ?',chatId);
        if (check.username == currentUserName){
            return true;
        }
        return false;
    }catch(e){
        console.error(e);
    }
}


export async function getUsers(db){
    let users = [];
    try{
        await db.each('SELECT * FROM users', (err,rows) =>{users.push(rows)});
        return users;
    }catch(e){
        console.error(e);
    }
}

    
