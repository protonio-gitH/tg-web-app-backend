import TelegramBot from "node-telegram-bot-api";
import sqlite3 from "sqlite3";
import fs from 'fs/promises'; 
import { open } from "sqlite";
import express from "express";
import cors from 'cors';
import {getDb} from './db.js';
import { createUser, getUsers,checkUserName } from "./functions.js";
import 'dotenv/config';

const webAppUrl = 'https://courageous-donut-10b6f0.netlify.app/';


const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());


start();

async function start(){
    bot.setMyCommands([
        {command:'/start',description:'Для старта и перезагрузки бота'}
    ])
    bot.on('message', async (msg) => {
        
        // console.log(msg)
        const db = await getDb();
        const chatId = msg.chat.id;
        const username = msg.from.username;
        const name = msg.from.first_name;
        const text = msg.text;
        const isCreated = await db.get('SELECT * FROM users WHERE tgId = ?',chatId);
        let admins = [];
        const adminsRead = await fs.readFile('./admins.txt','utf-8');
        
        admins = [...adminsRead.split('\r\n')];
        console.log(admins)

        if (isCreated == undefined){
            await createUser(db,chatId,username,name,false);
        }
        let checRes = await checkUserName(db,username,chatId);
        if (checRes == false){
            try{
                let update = await db.run('UPDATE users SET username = ? WHERE tgId = ?', username,chatId);
            }catch(e){
                console.error(e);
            }
        }
        // console.log(await db.each('SELECT * FROM users', (err,rows) =>{console.log(rows)}));
        // const del = await db.run('DELETE  FROM users');
        

        if (text == '/start'){
            
            if (admins.includes(chatId.toString())){
                await bot.sendMessage(chatId, `Приветствую ${msg.from.first_name}`,{
                    reply_markup:{
                        keyboard:[
                            [{text:'Проблемы с товаром',web_app:{url:webAppUrl}}],
                            [{text:'Оставить отзыв'},{text:'🆘 Помощь'}],
                            [{text:'Админ панель'}]
                            
                        ],
                        resize_keyboard: true
                    }
                });
            }
            else{
                await bot.sendMessage(chatId, `Приветствую ${msg.from.first_name}`,{
                    reply_markup:{
                        keyboard:[
                            [{text:'Проблемы с товаром',web_app:{url:webAppUrl}}],
                            [{text:'Оставить отзыв'},{text:'🆘 Помощь'}]
                            
                        ],
                        resize_keyboard: true
                    }
                });
            }
            
        }  

        if (text == 'Оставить отзыв'){
            await bot.sendMessage(chatId,'Напишите свой отзыв');
            return createReview(db,chatId);
            // bot.sendMessage(chatId,'Оставить отзыв',{
            //     reply_markup:{
            //         inline_keyboard:[
            //             [{text: 'Оставить отзыв с фотографией', callback_data: 'questions'}],
            //             [{text: 'Ос, callback_data: 'help'}],
                        
            //         ]
            //     }
            // })
        }

        if (msg?.web_app_data?.data){
            try{
                const data = JSON.parse(msg?.web_app_data?.data);
                let admins = [];
                await bot.sendMessage(chatId,'Спасибо за обратную связь')
                const adminsRead = await fs.readFile('./admins.txt','utf-8');
                admins = [...adminsRead.split('\r\n')];
                for (let admin of admins){
                    console.log(data);
                    await bot.sendMessage(admin,`Проблема с товаром\n\nИмя товара ${data?.name}\nПроблема: ${data?.problem}\n\nОтправитель: @${msg.from.username}` );
                    
                }    
            }catch(e){
                console.error(e);
            }
            
        }

        if (text == '🆘 Помощь'){
            await bot.sendMessage(chatId,'Выберите интересующий вас раздел:',{
                reply_markup:{
                    inline_keyboard:[
                        // [{text: '❔Ответы на вопросы', callback_data: 'questions'}],
                        [{text: '👨‍💻 Служба поддержки', callback_data: 'help'}],
                        
                    ]
                }
            });
        }
        if (text == 'Админ панель'){
            const db = await getDb();
            await bot.sendMessage(chatId,'Админ панель:',{
                reply_markup:{
                    inline_keyboard:[
                        [{text:'Список пользователей', callback_data: 'users_list'}],
                        [{text:'Создать рассылку с изображением', callback_data: 'newsletter'}],  
                        [{text:'Создать рассылку без изображения', callback_data: 'newsletter_without_photo'}],  
                        [{text:'Текущая рассылка с фото', callback_data: 'current_newsletter_photo'}],  
                        [{text:'Текущая рассылка без фото', callback_data: 'current_newsletter'}],  
                        [{text:'Запустить рассылку с фото', callback_data: 'start_newsletter_photo'}],  
                        [{text:'Запустить рассылку без фото', callback_data: 'start_newsletter'}],  
                    ],
            
                }
            });
        }
        if (text == 'Список пользователей'){
            let users = await getUsers(db);
            users = users.map(item => JSON.stringify(item));
            await fs.writeFile('./users.txt',users.join('\n'));
            await bot.sendDocument(chatId,'./users.txt', {
                caption: `Список юзеров`
            });
        }
    });
}



async function createNewsletterPhoto(db,chatId){
    await bot.sendMessage(chatId,'Отправьте фотографию для рассылки');
    bot.on('message', async(msg) => {
        if (msg.photo){
            try{
                let photo = msg.photo.at(-1).file_id;
                bot.removeListener('photo');
                await bot.sendMessage(chatId,'Теперь отправьте текст рассылки');
                const newsletterHandler = async (msg) => {
                    const text = msg.text;
                    await db.run('UPDATE newsletter SET photo = ?,caption = ? WHERE id = ?',photo,text,1);
                    await bot.sendMessage(chatId,'Рассылка была создана');
                    bot.removeListener('message',newsletterHandler);
                }
                bot.on("message",newsletterHandler);
            }catch(e){
                console.error(e);
            }

        }else{
            bot.removeListener('message');
            start();
        }
        
    })
    
    
}

async function createNewsletter(db,chatId){
    await bot.sendMessage(chatId,'Отправьте текст для рассылки');
    bot.on('message', async(msg) => {
        if (msg.text && msg.text != '🆘 Помощь' &&  msg.text != 'Отзывы' && msg.text != 'Проблема с товаром'){
            try{
                const text = msg.text;
                await db.run('UPDATE newsletter SET caption = ? WHERE id = ?',text,2);
                await bot.sendMessage(chatId,'Рассылка была создана');
                bot.removeListener('message');
                start()
            }catch(e){
                console.error(e);
                bot.removeListener('message');
                start()
            }
            // bot.on("message",newsletterHandler);
        }else{
            bot.removeListener('message');
            start();
        }
        
    })
    
    
}

async function createReview(db,chatId){
    bot.on("message",async(msg) => {
        if (msg.text != 'Проблемы с товаром' && msg.text != 'Оставить отзыв' && msg.text != '🆘 Помощь' && msg.text != 'Админ панель'){
            // await bot.sendMessage(chatId,'Ваш отзыв:');
            await bot.sendMessage(chatId,`Ваш отзыв:\n\n${msg.text}`,{
                reply_markup:{
                    inline_keyboard:[
                        [{text:'✅ Отправить отзыв', callback_data: 'send_review'}],
                        [{text:'❌ Отменить отправку отзыва', callback_data: 'cancel_review'}],  
                         
                    ],
            
                }
            })
            bot.removeListener('message');
            handleReview(msg);
        }
        else{
            bot.removeListener('message');
            start();
        }
    })
}

async function handleReview(mess){
    const callbackReviewHandle = async (msg) => {
        if (msg.data == 'send_review'){
            
            let admins = [];
            const adminsRead = await fs.readFile('./admins.txt','utf-8');
            admins = [...adminsRead.split('\r\n')];
            await bot.editMessageText(`✅ Ваш отзыв был отправлен`,{
                message_id:msg.message.message_id,
                chat_id:msg.message.chat.id
            });
            // bot.forwardMessage();
            await bot.sendMessage(-1002099668909,`Был отправлен отзыв от @${mess.from.username}\n\n${mess.text}`);
               
            for (let admin of admins){
                try{
                    await bot.sendMessage(+admin,`Был отправлен отзыв от @${mess.from.username}\n\n${mess.text}`);
                    
                    
                    bot.removeListener('message');
                    bot.removeListener('callback_query',callbackReviewHandle);
                    start();
                    
                }catch(e){
                    console.error(e);
                    bot.removeListener('message');
                    bot.removeListener('callback_query',callbackReviewHandle);
                    start();
                }    
            }
        }
        if(msg.data == 'cancel_review'){
            await bot.editMessageText(`❌ Отзыв не отправлен`,{
                message_id:msg.message.message_id,
                chat_id:msg.message.chat.id
            });
            bot.removeListener('message');
            bot.removeListener('callback_query',callbackReviewHandle);
            start();
            
        }
    }
    bot.on('callback_query', callbackReviewHandle);
}

bot.on('callback_query',async (msg) => {
    const chatId = msg.message.chat.id;
    const db = await getDb();
    if (msg.data == 'users_list'){
        let users = await getUsers(db);
        users = users.map(item => JSON.stringify(item));
        await fs.writeFile('./users.txt',users.join('\n'));
        await bot.sendDocument(chatId,'./users.txt', {
            caption: `Список юзеров`
        });
    }
    if (msg.data == 'newsletter'){
        
        return createNewsletterPhoto(db,chatId);
        
        // bot.sendPhoto(chatId,'AgACAgIAAxkBAAIEnWXOj0ChkxXXjwMqQkrAMdvyCQlmAAIY2zEbGfFxSvuooz1Y96SXAQADAgADbQADNAQ',{
        //     caption:'123'
        // })
    }
    if (msg.data == 'newsletter_without_photo'){
        return createNewsletter(db,chatId);
    }
    if (msg.data == 'current_newsletter_photo'){
        try{
            let getPhoto = await db.get('SELECT photo FROM newsletter WHERE id = 1');
            let getCaption = await db.get('SELECT caption FROM newsletter WHERE id = 1');
            
            await bot.sendPhoto(chatId,getPhoto.photo,{
                caption:getCaption.caption
            })
        }catch(e){
            console.error(e);
        }
    }
    if (msg.data == 'current_newsletter'){
        try{
            let getCaption = await db.get('SELECT caption FROM newsletter WHERE id = 2');
            
            await bot.sendMessage(chatId,getCaption.caption)
        }catch(e){
            console.error(e);
        }
    }
    if (msg.data == 'start_newsletter_photo'){
        await bot.sendMessage(chatId,'Запустить рассылку?',{
            reply_markup:{
                inline_keyboard:[
                    [{text:'Да', callback_data: 'yes_newsletter_photo'}],
                    [{text:'Нет', callback_data: 'no_newsletter'}],  
                ],
                }
            })
    }
    if (msg.data == 'start_newsletter'){
        await bot.sendMessage(chatId,'Запустить рассылку?',{
            reply_markup:{
                inline_keyboard:[
                    [{text:'Да', callback_data: 'yes_newsletter'}],
                    [{text:'Нет', callback_data: 'no_newsletter'}],  
                ],
                }
            })
    }
    if(msg.data == "yes_newsletter"){
        try{
            let users = await getUsers(db);
            let getCaption = await db.get('SELECT caption FROM newsletter WHERE id = 2');
            await bot.editMessageText(`✅ Рассылка начала отправку сообщений`,{
                message_id:msg.message.message_id,
                chat_id:msg.message.chat.id
            });
            for (let elem of users){
                await bot.sendMessage(elem.tgId,getCaption.caption);
            }
        }catch(e){
            console.error(e);
        }
    }
    if(msg.data == "yes_newsletter_photo"){
        try{
            let users = await getUsers(db);
            let getPhoto = await db.get('SELECT photo FROM newsletter WHERE id = 1');
            let getCaption = await db.get('SELECT caption FROM newsletter WHERE id = 1');
            await bot.editMessageText(`✅ Рассылка начала отправку сообщений`,{
                message_id:msg.message.message_id,
                chat_id:msg.message.chat.id
            });
            for (let elem of users){
                await bot.sendPhoto(elem.tgId,getPhoto.photo,{
                    caption:getCaption.caption
                });
            }
        }catch(e){
            console.error(e);
        }
    }
    if(msg.data == 'no_newsletter'){
       await bot.editMessageText(`❌ Рассылка не была запущена`,{
        message_id:msg.message.message_id,
        chat_id:msg.message.chat.id
    });
    
    }
    if (msg.data == 'help'){
        await bot.editMessageText('🆘 По всем вопросам писать @adamssupp',{
            message_id:msg.message.message_id,
            chat_id:msg.message.chat.id
        });
    }

    // if (msg.data == 'send_review'){
    //     let admins = [];
    //     const adminsRead = await fs.readFile('./admins.txt','utf-8');
    //     admins = [...adminsRead.split('\r\n')];
    //     for (let admin of admins){
    //         try{
    //             await bot.sendMessage(+admin,'Был отправлен отзыв')
    //         }catch(e){
    //             console.error(e);
    //         }    
    //     }
    // }
    
})



const PORT = 8000;


// app.listen(PORT, () => console.log('server started on port ' + PORT));