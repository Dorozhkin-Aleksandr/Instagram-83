const express = require('express')
// достаём пакет экспресс для создания сервера
const path = require('path')
// подключаем пакет path для работы с путями в файловой системе

const { db } = require('./DB.js')
// импортируем объект с БД из файла
const { dbUser } = require('./DBuser.js')
// импортируем объект с БД пользователей из файла
const { sessions } = require('./sessions')
// импортируем объект с пользовательскими сессиями из файла sessions.js

const { checkAuth } = require('./src/middlewares/checkAuth.js')
// импортируем объект файл checkAuth (там у нас проверка автоизации пользователя перед входом на страницу блога)

const cookieParser = require('cookie-parser')
// установили пакет куки парсер, нужен для работы с куками

const server = express()
// создали экземпляр сервера
const PORT = 3000
// выбрали 3000 порт

const hbs = require('hbs')
const { request } = require('http')
const { response } = require('express')
const res = require('express/lib/response')
//достаём пакет hbs

//const sessions = {} //сюда будем добавлять информацию о вошедшем пользователе
//в итоге решили его убрать в отдельный файл, оставил здесь для себя в качестве примера


server.set('view engine', 'hbs')
// подключил шаблонизатор HBS
server.set('views', path.join(__dirname, 'src', 'views'))
// подключил папку с "усами" (views, src - папки с hbs, __dirname - путь до папки с проектом, определяется динамически)
// я папку views подключаю с применением __dirname потому, что (process.env.PWD, 'src', 'views') не стал работать на моей тетовой системе
hbs.registerPartials(path.join(__dirname, 'src', 'views', 'partials'))
// папка partials для частичных шаблонов, у нас это заголовок сайта с навигацией


server.use(express.urlencoded({ extended: true }))
// без этой строки сервер не будет принимать данные из пользовательской формы
// она должна распологаться раньше, чем описание "слушателя"

server.use(cookieParser())
// учим экспресс принимать данные из куки (подключаем пакет как мидлвару)







// глобальная мидл вара для всего приложения
server.use((request, response, next) => {
    const sidFromUser = request.cookies.sid
    //взяли айдишник сессии из куки
    const currentSession = sessions[sidFromUser]

    if (currentSession) {
        const currentUser = dbUser.users.find((user) => user.email == currentSession.email)
        //вытащили из БД пользователей почту текущего юзера
        response.locals.name = currentUser.name
        response.locals.email = currentUser.email
        //для  передачи почты текущего пользователя в страницу ХБС
        //альтернативный вариант передать данные  вторым аргументом в объекте response.render('ххх' {ЗДЕСЬ})

        //по аналогии вытащу имя пользователя для блога, чтобы ему не приходилоь его повторно набирать
    }
    next()
})



server.get('/', function (request, response) {
    response.render('main')
})




// Этот большой блок отвечает за регистрацию пользователя, срабатывает в случае перехода пользователя в раздел SignUp
server.get('/auth/signup', (request, response) => {
    response.render('signUp')
})
// эта часть блока отвечает за приём данных из пользовательской формы регистрации на сайте
// данные, которые пользовательотправил через запрос POST перейдут в массив (массив хранится в оперативке ПК)
// далее сервер формирует сессию и куку для пользователя
// в самом низу происходит редирект на главгую страницу
server.post('/auth/signup', (request, response) => {
    const { name, email, password } = request.body
    dbUser.users.push({
        name,
        email,
        password,
    })

    const sid = Date.now() // формируем уникальный ключ sid - session id, Date.now - количество мс с 1970 года
    sessions[sid] = {
        email,
    }

    response.cookie('sid', sid, {
        httpOnly: true,  //ограничили доступ к куке через JS
        maxAge: 120000,
    }) //в () название и значение, которое буде содержать кука и настройки куки

    response.redirect('/') //редиректим пользователя на главную страницу (для метода пост нельзя применять метод render)
}) //для принятия данных из формы signUp в объект dbUser





// Этот большой блок отвечает за ВХОД пользователя через SignIn
// этот блок кода практически идентичен вышестоящему SignUp
server.get('/auth/signin', (request, response) => {
    response.render('signIn')
})

server.post('/auth/signin', (request, response) => {
    const { email, password } = request.body

    //получили данные из формы, теперь нужно проверить есть ли такой пользователь в нашей БД
    const currentUser = dbUser.users.find((user) => user.email == email)
    if (currentUser) {

        if (currentUser.password == password) {
            const sid = Date.now()
            sessions[sid] = {
                email,
            }

            response.cookie('sid', sid, {
                httpOnly: true,
                maxAge: 120000,
            })

            return response.redirect('/')
        }

    }
    response.redirect('/auth/signup')
    //так как у нас рядом два redirect, то перед первым нужно указать нашей функции return, иначе они могут последовательно выполнится
})




//в этом блоке описан выход пользователя из системы
server.get('/auth/signout', (request, response) => {
    const sidFromUserCookie = request.cookies.sid
    //получили идентификатор сессии от пользователя (sid - это имя нашей куки)

    delete sessions[sidFromUserCookie]
    //удаляем данные пользователя из хранилища (на сервере)

    response.clearCookie('sid')
    //команда браузеру, чтобы он почистил куку
    response.redirect('/')
    //отправляем пользователя на главную страницу

})







// этот блок отвечает за переход на страницу блога
server.get('/blog', checkAuth, function (request, response) {
    // checkAuth проверит авторизован ли пользователь
    //const userQueryParameters = request.query //сохраняет в объекте запрос пользователя это было нужно для qw параметров
    let messagesForRender = db.messages

    response.render('blog', { listOfMessages: messagesForRender })
    // отправляем на рендер страницу блога и объект с сообщениями пользователя из БД
})

// этот блок отвечает за приём данных из формы отправки постов
server.post('/messagebook', (request, response) => {
    const dataFromForm = request.body

    db.messages.push(dataFromForm)
    // проверил через консоль все данные включая idUser уходят в объект с сообщениями
    response.redirect('/blog')
})




// ниже обрабатывается запрос из формы от кнопки удаления поста
server.post('/deletepost', (request, response) => {
    const idPost = request.body
    //в переменную idPost отправили, всё что пришло с формы с кнопкой (объект)
    //должен прийти текст сообщения (в объекте), по нему я буду искать в БД нужный пост для его удаления
    //самый простой, но не безопасный вариант, сроки реализации поджимают 8)  

    const currentPostIndex = db.messages.findIndex((element) => element.message == idPost.message)
    //так нашел индекс нужного поста для удаления
    //напомню, что в моём случае идентификтором поста будет сообщение из него
    //использую idPost.message так как присланное сообщение находится в объекте с ключем message

    //перед тем, как удалить пост, я делаю проверку соответсвует ли указанный при регистрации пользователем e-mail
    //адресу почты из поста в БД (ключ idUser):
    if ((db.messages[currentPostIndex].idUser) == response.locals.email) {

        db.messages.splice(currentPostIndex, 1)
        //удалил из массива сообщений нужный пост
        response.redirect('/blog')
        //после удаления поста переотправляю пользователя обратно в блог на отрисовку данных
    }
    else {
        return response.render('403.hbs')
        //иначе отправляем на страницу с ошибкой
    }

})







//этот блок отвечает на левые запросы пользователя, если он будет вводить некорректный адрес страницы
server.get('*', (request, response) => {   //* -значит любая абра-кадабра)
    response.render('404.hbs')
})
// второй обработчик, который сработаеyт в случае, если пользователь введет неправильный адрес или запрос
// если обработчиков несколько, то важен порядок их расположения, с 404 страницей должен быть последний


server.listen(PORT, () => {
    console.log(`Server has been started on port: ${PORT}`)
})
// запустили наш сервер на 3000 порту