import TelegramBot from "node-telegram-bot-api";
import 'dotenv/config';
import express from "express";
import cors from 'cors';

const webAppUrl = 'https://courageous-donut-10b6f0.netlify.app/';

// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.BOT_TOKEN, {polling: true});
const app = express();

app.use(express.json());
app.use(cors());

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text == '/start'){
    await bot.sendMessage(chatId, `Приветствую ${msg.from.first_name}`,{
        reply_markup:{
            keyboard:[
                [{text:'Проблемы с товаром',web_app:{url:webAppUrl}}],
                [{text:'Отзывы'},{text:'🆘 Помощь'}]
                
            ],
            resize_keyboard: true
        }
    });

    
  }  

  if (msg?.web_app_data?.data){
    try{
        const data = JSON.parse(msg?.web_app_data?.data);
        console.log(data);
        await bot.sendMessage(chatId,'Спасибо за обратную связь')
        await bot.sendMessage(chatId,'Имя товара ' + data?.name);
        await bot.sendMessage(chatId,'Проблема ' + data?.problem);
    }catch(e){
        console.error(e);
    }
    
  }

  if (text == '🆘 Помощь'){
    await bot.sendMessage(chatId,'Выберите интересующий вас раздел:',{
        reply_markup:{
            inline_keyboard:[
                [{text: '❔Ответы на вопросы', callback_data: 'questions'}],
                [{text: '👨‍💻 Служба поддержки', callback_data: 'help'}],
                
            ]
        }
    });
  }
});



const PORT = 8000;


app.listen(PORT, () => console.log('server started on port ' + PORT));