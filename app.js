const express = require('express')
// достаём функцию экспресс из библиотеки
const path = require('path')
// формирует путь к файлам
const { db } = require('./DB.js')
// импортируем объект с БД из файла
const server = express()
// в переменной server экземпляр сервера
const PORT = 3000



server.set('view engine', 'hbs')
// подключил шаблонизатор HBS

server.set('views', path.join(__dirname, 'src', 'views'))
// подключил папку с "усами" (views, src - папки с hbs, __dirname - путь до папки с проектом, определяется динамически)


server.use(express.urlencoded({ extended: true }))
// без этой строки сервер не будет принимать данные из пользовательской формы
// она должна распологаться раньше, чем описание "слушателя"


server.get('/', function (request, response) {
    const userQueryParameters = request.query //сохраняет в объекте запрос пользователя
    let messagesForRender = db.messages

    if (userQueryParameters.limit !== undefined && Number.isNaN(+userQueryParameters.limit) === false) {
        messagesForRender = db.messages.slice(0, userQueryParameters.limit)
    }
    if (userQueryParameters.reverse !== undefined && userQueryParameters.reverse === "true") {
        messagesForRender = messagesForRender.reverse()
    }


    response.render('main', { listOfMessages: messagesForRender }) // main - название файла с Hbs кодом
}) // db.messages из импортированнного объекта
// обработчик с колбэк функцией (внутри объект запроса и объект ответа),обработчиков мб много

server.post('/messagebook', (request, response) => {
    const dataFromForm = request.body

    //console.log({ dataFromForm })
    db.messages.push(dataFromForm)

    response.redirect('/')
})
// 

server.get('*', (request, response) => {   //* -значит любая абра-кадабра)
    response.render('404.hbs')
})
// второй обработчик, который сработаеyт в случае, если пользователь введет неправильный адрес или запрос
// если обработчиков несколько, то важен порядок их расположения, с 404 страницей должен быть последний


server.listen(PORT, () => {
    console.log(`Server has been started on port: ${PORT}`)
})
// сервер будет работать на 3000 порту, всего доступно 2 в 16 степени портов