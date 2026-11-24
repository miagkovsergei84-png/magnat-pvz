// Story copy for the first playable campaign. The narrator is shown to the
// player as a storyteller from the future, not as a character already present.
globalThis.PptStoryContent = (() => {
  const portrait = Object.freeze({
    anna: 'assets/campaign/anna-portrait.webp',
    leo: 'assets/campaign/leo-portrait.webp',
    narrator: 'assets/campaign/narrator-portrait.webp',
    playerCasual: 'assets/campaign/hero-casual.webp',
    player: 'assets/campaign/hero-uniform.webp',
    eli: 'assets/campaign/eli-portrait.webp',
    maya: 'assets/campaign/maya-portrait.webp',
    nika: 'assets/campaign/nika-portrait-20261111.webp',
    cityBlogger: 'assets/campaign/city-blogger-portrait-20261111.webp'
  });
  const entry = (speaker, image, text) => Object.freeze({speaker, portrait:image, text});
  const scene = {
    prologue: {
      ru: [
        entry('Рассказчик', portrait.narrator, 'Всё началось с поездки в деревню, в гости к тёте Анне. Ты рассчитывал на тихий отдых, но одна посылка изменила планы.'),
        entry('Тётя Анна', portrait.anna, 'Заходи! Чай выпить успеем, а потом мне на автобус. Надо в городок за посылкой. И всё из-за горстки пуговиц!'),
        entry('Игрок', portrait.playerCasual, 'А в самой деревне её негде забрать? Так все и ездят за каждой посылкой?'),
        entry('Тётя Анна', portrait.anna, 'Все до одного. А вот и Лёва, он у нас посылки развозит. Лёв, расскажи, куда ты везёшь наши заказы.'),
        entry('Лёва', portrait.leo, 'В пункт в городке. Каждый раз везу их мимо нашего старого магазина. Там и полки целы, и хозяйка ищет, кому сдать помещение.'),
        entry('Игрок', portrait.playerCasual, 'А давайте откроем пункт в старом магазине! Я поговорю с хозяйкой. Если договоримся, буду выдавать посылки здесь.'),
        entry('Рассказчик', portrait.narrator, 'Хозяйка передала ключи. Анна отмыла прилавок, Лёва повесил вывеску. К первой доставке всё было готово.'),
        entry('Игрок', portrait.player, 'Наш пункт выдачи открыт! Тётя Аня, в следующий раз заказывай пуговицы сюда.')
      ],
      en: [
        entry('Narrator', portrait.narrator, 'It all started with a trip to the village to visit Aunt Anna. You expected a quiet break, but one package changed your plans.'),
        entry('Aunt Anna', portrait.anna, 'Come in! There’s time for tea before my bus. I have to go all the way into town to pick up a package. All for a handful of buttons!'),
        entry('You', portrait.playerCasual, 'Isn’t there anywhere to pick it up in the village? Does everyone have to make that trip?'),
        entry('Aunt Anna', portrait.anna, 'Every last one of us. Oh, there’s Leo. He drives the delivery truck. Leo, tell us where our packages go.'),
        entry('Leo', portrait.leo, 'To the pickup point in town. I pass the old village shop on every run. The shelves are still up, and the owner’s looking for a tenant.'),
        entry('You', portrait.playerCasual, 'Let’s open a pickup point in that shop! I’ll talk to the owner. If she agrees, I’ll run it.'),
        entry('Narrator', portrait.narrator, 'The owner handed over the keys. Anna scrubbed the counter, Leo hung the sign, and the shop was ready for its first delivery.'),
        entry('You', portrait.player, 'Our pickup point is open! Aunt Anna, next time you need buttons, have them sent here.')
      ]
    },
    first_day_complete: {
      ru: [
        entry('Тётя Анна', portrait.anna, 'Ну как первая смена? Соседка уже спрашивала, какой адрес выбирать, чтобы заказы приходили сюда.'),
        entry('Игрок', portrait.player, 'Ноги гудят, зато адрес теперь могу назвать во сне. Давай запишу его для соседки. Есть листок?'),
        entry('Тётя Анна', portrait.anna, 'Держи. А я ещё копию повешу у остановки, рядом с расписанием. Там её точно заметят.'),
        entry('Рассказчик', portrait.narrator, 'Наутро записку читали по дороге на работу. А с работы почти вся улица возвращалась в одно и то же время.')
      ],
      en: [
        entry('Aunt Anna', portrait.anna, 'How was your first shift? My neighbor wants to know which address to pick when she places her next order.'),
        entry('You', portrait.player, 'My feet are sore, but I could recite our address in my sleep. I’ll write it down for her. Got a piece of paper?'),
        entry('Aunt Anna', portrait.anna, 'Here you go. I’ll put a copy by the bus schedule, too. Everyone will see it there.'),
        entry('Narrator', portrait.narrator, 'The next morning, people stopped to read the note on their way to work. Almost everyone on that street finished work at the same time.')
      ]
    },
    // Interludes between shifts. Each one is shown once, before the next
    // briefing, and never changes money, staff, rating or chapter progress.
    village_team: {
      ru: [
        entry('Маша', portrait.maya, 'Заглянула к вам сегодня. В очереди трое, и никто не ворчит! С напарником дело пошло быстрее.'),
        entry('Игрок', portrait.player, 'Вдвоём успеваем и коробки разобрать, и с каждым поздороваться. Спасибо, что посоветовала искать помощника.'),
        entry('Маша', portrait.maya, 'А дед Семён зашёл просто посмотреть, как тут всё устроено. Ушёл с заказом на удочку!'),
        entry('Рассказчик', portrait.narrator, 'Так в пункте появилась команда. Кому разгружать, кому сортировать, а кому стоять на выдаче, решаешь ты. Роли меняются в магазине, в разделе команды.')
      ],
      en: [
        entry('Maya', portrait.maya, 'I stopped by today. Three people in line, and nobody was grumbling! Things move faster with a helper.'),
        entry('You', portrait.player, 'With two of us, there’s time to sort the boxes and say hello to everyone. Thanks for telling me to look for help.'),
        entry('Maya', portrait.maya, 'Old Simon just dropped in to see how the place works. He left with an order for a fishing rod!'),
        entry('Narrator', portrait.narrator, 'That’s how the pickup point got its team. Who unloads, who sorts and who works the counter is your call. You can change roles in the shop’s team section.')
      ]
    },
    village_rent_notice: {
      ru: [
        entry('Игрок', portrait.player, 'Тётя Аня, тут под дверью записка от хозяйки. Послезавтра она поднимет аренду до $150 в день.'),
        entry('Тётя Анна', portrait.anna, 'Сто пятьдесят за нашу лавку? Слушай, у остановки висят объявления. У нас в деревне продают несколько домов. Может, возьмём свой?'),
        entry('Игрок', portrait.player, 'Давай прикинем. Захвати объявления, если пойдёшь мимо. После смены вместе посмотрим.')
      ],
      en: [
        entry('You', portrait.player, 'Aunt Anna, the shop owner slipped a note under the door. She’s raising the rent to $150 a day, starting the day after tomorrow.'),
        entry('Aunt Anna', portrait.anna, 'A hundred and fifty for this little shop? I saw a few houses for sale on the noticeboard at the bus stop. What if we bought our own?'),
        entry('You', portrait.player, 'Let’s see what we can afford. Pick up the listings if you pass that way. We can look at them after work.')
      ]
    },
    village_house_listings: {
      ru: [
        entry('Тётя Анна', portrait.anna, 'Вот, принесла фотографии. Смотри, дом у липы, дом пекаря и дом путейца. Все три давно пустуют.'),
        entry('Игрок', portrait.player, 'Представляю, как мы разбираем эти завалы, ставим прилавок у окна… А за дом придётся сразу всё отдать?'),
        entry('Тётя Анна', portrait.anna, 'Я со всеми поговорила. За любой можно платить по частям. Выберешь дом — приходи за мной, помогу с уборкой.'),
        entry('Игрок', portrait.player, 'Давай разложим фотографии рядом. А если с покупкой решим подождать, пока поработаем в лавке.')
      ],
      en: [
        entry('Aunt Anna', portrait.anna, 'I brought photos. Here’s Linden House, the Baker’s House and the Track Keeper’s House. All three have been empty for years.'),
        entry('You', portrait.player, 'I can picture it. We clear out all that stuff, put our counter by the window… Would we have to pay for the house all at once?'),
        entry('Aunt Anna', portrait.anna, 'I spoke to all three owners. They’ll let us pay in installments. Come get me when you’ve picked a house. I’ll help you clear it out.'),
        entry('You', portrait.player, 'Let’s lay the photos side by side. If we’d like to wait a bit, we can keep working at the shop.')
      ]
    },
    village_house_condition: {
      ru: [
        entry('Игрок', portrait.player, 'Ну, здравствуй, наш дом! Тётя Аня, осторожно, тут доска шатается. А вот и ведро под крышей.'),
        entry('Тётя Анна', portrait.anna, 'Понятно, для чего его поставили. Давно дом стоял без присмотра. Возьмёмся за крышу, потом за остальное.'),
        entry('Игрок', portrait.player, 'Сначала бы до окна добраться. Смотри, за сундуком даже вешалки не видно!'),
        entry('Тётя Анна', portrait.anna, 'Погоди выбрасывать. Я записала, что стоит сохранить. Давай поищем эти вещи и освободим место для прилавка.')
      ],
      en: [
        entry('You', portrait.player, 'Well, hello there, house of ours! Mind that loose board, Aunt Anna. Somebody’s left a bucket under the roof.'),
        entry('Aunt Anna', portrait.anna, 'I can see why they put it there. This place hasn’t had anyone looking after it for a long time. We’ll mend the roof, then see to the rest.'),
        entry('You', portrait.player, 'First I’d like to reach the window. Look, you can hardly see the coat rack behind that trunk!'),
        entry('Aunt Anna', portrait.anna, 'Hold on before you throw anything out. I made a list of things worth keeping. Let’s find them and make room for the counter.')
      ]
    },
    village_repair_paths: {
      ru: [
        entry('Тётя Анна', portrait.anna, 'Вот и кладовая разобрана! Теперь к крыше. Какой способ ни выберем, у стены станет сухо. Я пять вариантов нашла.'),
        entry('Игрок', portrait.player, 'А если своими руками? Натянем брезент, а из досок сколотим поддон. На нём поместится ещё одна коробка.'),
        entry('Тётя Анна', portrait.anna, 'А вот деревенский уют. Сделаем сухой чердак и сможем оставлять там до четырёх посылок до следующей смены.'),
        entry('Игрок', portrait.player, 'В почтовой конторе мне нравятся мансардные окна. При таком свете я буду брать коробки с полок на 15% быстрее.'),
        entry('Тётя Анна', portrait.anna, 'У почтового амбара есть подъёмник. Раз за рейс им можно отправить одну обычную коробку из фургона прямо на её полку. Даже с полной тележкой!'),
        entry('Игрок', portrait.player, 'А у дома с садом вода с крыши идёт в бочку для полива. В дождливую смену сад прибавит 0,2 звезды к рейтингу.'),
        entry('Тётя Анна', portrait.anna, 'Сегодня выбирай только крышу. Для окон можно взять тот же стиль и начать набор, а можно попробовать другой стиль. Дом-то твой!')
      ],
      en: [
        entry('Aunt Anna', portrait.anna, 'That’s the storeroom cleared! Now for the roof. Whichever way we fix it, the wall will stay dry. I found five ways to do it.'),
        entry('You', portrait.player, 'I could go Handmade. We’d stretch a tarp over the roof and make a pallet from the spare boards. That’s room for one extra box.'),
        entry('Aunt Anna', portrait.anna, 'Or there’s Country Comfort. A dry attic would let us keep up to four parcels overnight for the next shift.'),
        entry('You', portrait.player, 'I like the skylights on the Post Office roof. With that much daylight, I’d pick parcels off the shelves 15% faster.'),
        entry('Aunt Anna', portrait.anna, 'The Parcel Barn has a hoist. Once per delivery, it sends one regular parcel straight from the van to its shelf. Even if your cart’s full!'),
        entry('You', portrait.player, 'And the Garden House collects rain from the roof in a barrel for watering. The garden adds 0.2 stars to our rating on rainy shifts.'),
        entry('Aunt Anna', portrait.anna, 'You only need to pick a roof today. For the windows, you can keep the same style and start a set, or try another style. It’s your house!')
      ]
    },
    // One conversation before each of the later repairs. The last line hands
    // over to the repair card, where options in an earlier style carry a star.
    village_repair_walls: {
      ru: [
        entry('Тётя Анна', portrait.anna, 'Две смены под новой крышей, и ни одной мокрой коробки! Только из рам всё ещё дует. Гости в очереди ёжатся и теряют терпение быстрее.'),
        entry('Игрок', portrait.player, 'Значит, пора браться за окна и стены. Могу сам сделать полку у окна: отложу туда две коробки и выдам их прямо от стойки.'),
        entry('Тётя Анна', portrait.anna, 'А я бы сложила тёплую печку. В дождь и зимой гости первые 20 секунд ждут у неё без потери терпения.'),
        entry('Игрок', portrait.player, 'Ещё есть широкие ворота: каждый фургон простоит на разгрузке на 30 секунд дольше. Или полка обмена: соседи заберут каждый пятый возврат и заплатят $2.'),
        entry('Тётя Анна', portrait.anna, 'И вот что я заметила: когда дом сделан в одном стиле, люди останавливаются полюбоваться. Возьмёшь для окон стиль крыши — начнётся набор.'),
        entry('Рассказчик', portrait.narrator, 'Каждая деталь набора после первой приносит в кассу $5 в конце каждой смены. В карточке ремонта такие варианты отмечены звездой.')
      ],
      en: [
        entry('Aunt Anna', portrait.anna, 'Two shifts under the new roof, and not one wet box! But there’s still a draft from the window frames. People in line are shivering and losing patience faster.'),
        entry('You', portrait.player, 'Then it’s time for the windows and walls. I could build a counter shelf myself. I’d set two parcels aside there and hand them out right at the counter.'),
        entry('Aunt Anna', portrait.anna, 'I’d build a warm stove. In rain or winter, guests by the stove keep their patience for the first 20 seconds.'),
        entry('You', portrait.player, 'There are freight doors, too. Each van would stay 30 seconds longer for unloading. Or an exchange shelf: the neighbors take every fifth return and pay $2 for it.'),
        entry('Aunt Anna', portrait.anna, 'And here’s something I’ve noticed. When a house is done in one style, people stop to admire it. Use the roof’s style for the windows, and you’ll start a set.'),
        entry('Narrator', portrait.narrator, 'Every matching piece after the first adds $5 to the cash at the end of each shift. On the repair card, those options are marked with a star.')
      ]
    },
    village_repair_floor: {
      ru: [
        entry('Лёва', portrait.leo, 'Чуть тележку в пролом не уронил! Три дыры в полу, и каждую приходится объезжать.'),
        entry('Маша', portrait.maya, 'А я младшего за руку держу, пока стоим в очереди. Шаг в сторону — и нога уже в подполе.'),
        entry('Игрок', portrait.player, 'Всё, берёмся за пол и заделываем все три пролома. Под фанерной заплатой можно устроить тайник: раз в смену там найдётся от $5 до $20.'),
        entry('Лёва', portrait.leo, 'А ты разметь дорожку, как у нас на складе. По ней ходят на 10% быстрее. Или сделай погреб под люком: туда встанут три посылки.'),
        entry('Маша', portrait.maya, 'Мне бы детский коврик. Пока малыши играют, родители готовы ждать на 20 секунд дольше.'),
        entry('Лёва', portrait.leo, 'Только про набор не забудь. Что в одном стиле с прошлыми ремонтами, то со звездой, и в кассе за это прибавка.')
      ],
      en: [
        entry('Leo', portrait.leo, 'I nearly dropped my cart through a hole! There are three of them in this floor, and I have to steer around every one.'),
        entry('Maya', portrait.maya, 'I hold my little one’s hand the whole time we’re in line. One step to the side and your foot’s in the crawl space.'),
        entry('You', portrait.player, 'Right, the floor is next. We’ll patch all three holes. Under a plywood patch, I could keep a cache and find $5–20 there once per shift.'),
        entry('Leo', portrait.leo, 'Mark out a walkway, like the one at our depot. You walk 10% faster on it. Or put a cellar under a hatch. That’s room for three parcels.'),
        entry('Maya', portrait.maya, 'I’d love a play mat. While the little ones play, parents will wait 20 seconds longer.'),
        entry('Leo', portrait.leo, 'Don’t forget your set, though. Anything in the same style as your earlier repairs has a star, and it brings in extra cash.')
      ]
    },
    village_repair_lights: {
      ru: [
        entry('Рассказчик', portrait.narrator, 'Посреди выдачи в щитке опять щёлкнуло. Свет погас, касса замолчала, и очередь замерла в полутьме.'),
        entry('Тётя Анна', portrait.anna, 'Этой проводке больше лет, чем мне! В темноте я свою посылку с пуговицами от чужой не отличу.'),
        entry('Игрок', portrait.player, 'Меняем проводку целиком, чтобы пробки больше не выбивало. А светильники выберем. Гирлянда в праздничную смену даст по $2 за каждую выданную посылку.'),
        entry('Тётя Анна', portrait.anna, 'А мне по душе абажуры и радио. Утром включишь бодрую музыку и будешь ходить на 10% быстрее. Под спокойную гости подождут на 10% дольше.'),
        entry('Игрок', portrait.player, 'Солнечная панель тоже хороша: в солнечную смену содержание дома дешевле на 20%. А табло вызова само позовёт гостя с короной к свободному окну.'),
        entry('Тётя Анна', portrait.anna, 'Уже четвёртый ремонт! Посмотри, какого стиля у нас больше. Чем длиннее набор, тем больше прибавка в кассе.')
      ],
      en: [
        entry('Narrator', portrait.narrator, 'In the middle of a busy hour, the fuse box clicked again. The lights went out, the register went quiet, and the line froze in the gloom.'),
        entry('Aunt Anna', portrait.anna, 'This wiring is older than I am! In the dark I can’t tell my parcel of buttons from anyone else’s.'),
        entry('You', portrait.player, 'We’ll replace all the wiring, so the breakers stop tripping. Then we pick the lights. Festive lights earn an extra $2 for every parcel handed out on a holiday shift.'),
        entry('Aunt Anna', portrait.anna, 'I’d love lamps and a radio. Put on lively music in the morning, and you’ll move 10% faster. Calm music makes guests wait 10% longer.'),
        entry('You', portrait.player, 'A solar panel is good, too. On sunny shifts, house upkeep costs 20% less. And a priority display calls a guest with a crown to the next free window.'),
        entry('Aunt Anna', portrait.anna, 'That’s our fourth repair already! See which style we have the most of. The bigger the set, the more extra cash it brings.')
      ]
    },
    village_repair_yard: {
      ru: [
        entry('Лёва', portrait.leo, 'У калитки бурьян по пояс, на дорожке старые доски. Часть людей доходит до забора, решает, что закрыто, и поворачивает назад.'),
        entry('Тётя Анна', portrait.anna, 'Остался последний ремонт — фасад и двор. Расчистим вход, и гостей снова будет столько же, сколько обычно.'),
        entry('Игрок', portrait.player, 'Хочу крыльцо со скамьёй: у крыльца гости первые 10 секунд ждут без потери терпения. Или ягодную лавку: варенье даст от $5 до $15 за смену.'),
        entry('Лёва', portrait.leo, 'А мне бы второе место для фургона! Разгружаешь любую из двух машин, а вторая ждёт своей очереди.'),
        entry('Тётя Анна', portrait.anna, 'Если весь дом выйдет в одном стиле, будет полный набор, пять из пяти. Вот тогда соседи точно придут посмотреть!'),
        entry('Рассказчик', portrait.narrator, 'Это был последний ремонт. После двух смен в готовом доме можно было думать о переезде в городок.')
      ],
      en: [
        entry('Leo', portrait.leo, 'The weeds by the gate are waist-high, and old boards cover the path. Some people get as far as the fence, think you’re closed and turn back.'),
        entry('Aunt Anna', portrait.anna, 'Just one repair left: the front of the house and the yard. Once we clear the entrance, we’ll get as many visitors as usual again.'),
        entry('You', portrait.player, 'I’d like a porch bench. Guests at the porch keep their patience for the first 10 seconds. Or a jam stall. Jam sales would bring in $5–15 each shift.'),
        entry('Leo', portrait.leo, 'I’d like a second loading space! You can unload either of two vans, and the second one waits its turn.'),
        entry('Aunt Anna', portrait.anna, 'If the whole house ends up in one style, that’s a full set, five out of five. Then the neighbors will definitely come to see it!'),
        entry('Narrator', portrait.narrator, 'This was the last repair. After two shifts in the finished house, you could start thinking about the move to town.')
      ]
    },
    village_town_offer: {
      ru: [
        entry('Лёва', portrait.leo, 'Вижу, Анна у остановки уже новый адрес повесила. Хотя у нас и так любой покажет, какой дом вы купили под пункт!'),
        entry('Игрок', portrait.player, 'Значит, дверью никто не ошибётся. А ты чего такой довольный?'),
        entry('Лёва', portrait.leo, 'Да на рынке в городке меня за рукав поймали. «Слышали про ваш деревенский пункт. Когда у нас на рынке такой откроете?»'),
        entry('Рассказчик', portrait.narrator, 'Лёва пообещал в следующий рейс узнать, есть ли у рынка свободное помещение. А тебе предстояло подготовить деревенский пункт к работе без тебя.')
      ],
      en: [
        entry('Leo', portrait.leo, 'I see Anna’s put the new address up at the bus stop. Mind you, anyone in the village could point out the house you bought for the pickup point!'),
        entry('You', portrait.player, 'Good, everyone knows which door to knock on. What’s got you grinning, Leo?'),
        entry('Leo', portrait.leo, 'Someone caught me by the sleeve at the town market today. “We’ve heard about that village pickup point. When do we get one here at the market?”'),
        entry('Narrator', portrait.narrator, 'Leo promised to ask about empty shops near the market on his next run. You still had to get the village pickup point ready to run while you were away.')
      ]
    },
    village_departure: {
      ru: [
        entry('Тётя Анна', portrait.anna, 'Сегодня сходила за пуговицами. Вернулась, а чай ещё горячий! Ключи оставь мне, мы с соседями присмотрим за пунктом.'),
        entry('Лёва', portrait.leo, 'В городке от рынка до пункта приходится идти через весь город. Мой знакомый Илья нашёл свободное помещение прямо у рынка. Подвезти?'),
        entry('Рассказчик', portrait.narrator, 'Лёва пошёл за фургоном. До отъезда оставалось выбрать одного человека из команды. Кто поможет тебе открыть новый пункт?')
      ],
      en: [
        entry('Aunt Anna', portrait.anna, 'I went to pick up my buttons today, and my tea was still hot when I got back! Leave me the keys. The neighbors and I will look after the place.'),
        entry('Leo', portrait.leo, 'People at the market have to walk clear across town to pick up their packages. My friend Eli found an empty shop right by the market. Want a ride?'),
        entry('Narrator', portrait.narrator, 'Leo went to get his truck. Before you set off, you had one choice to make. Which one of your employees would you take to open the new pickup point?')
      ]
    },
    town_arrival: {
      ru: [
        entry('Лёва', portrait.leo, 'Вот и рынок. Знакомься, это Илья. Илья, а вот и команда из деревни! Куда подъехать с коробками?'),
        entry('Илья', portrait.eli, 'Привет! Я здесь живу, по ту сторону площади. Видишь дверь у фонтана? Туда и заходите. Лёв, а фургону удобнее со двора.'),
        entry('Игрок', portrait.player, 'Помещение теперь наше! Как думаешь, откуда лучше видно вывеску? Хочется, чтобы люди нашли нас даже с двумя полными сумками в руках.'),
        entry('Илья', portrait.eli, 'От остановки. Сюда на рынок приезжают из окрестных деревень. Встань у лавочки, а я подержу вывеску. Видно?'),
        entry('Рассказчик', portrait.narrator, 'Вывеску было видно даже с дальнего конца площади. Лёва вернулся к своим доставкам, а вы с коллегой из деревни открыли двери.')
      ],
      en: [
        entry('Leo', portrait.leo, 'Here’s the market. I’d like you to meet Eli. Eli, this is the crew from the village! Where should I pull up?'),
        entry('Eli', portrait.eli, 'Hi! I live just across the square. See that door by the fountain? That’s your way in. Leo, it’s easier to unload out back.'),
        entry('You', portrait.player, 'The premises are ours now! Where should we hang the sign? I’d like people to spot us even with both arms full of groceries.'),
        entry('Eli', portrait.eli, 'People take the bus here from all the villages around town. Try that bench by the bus stop. I’ll hold up the sign. Can you see it?'),
        entry('Narrator', portrait.narrator, 'You could read it from the far end of the square. Leo went back to his deliveries, and you and your coworker from the village opened the doors.')
      ]
    },
    town_first_shift: {
      ru: [
        entry('Илья', portrait.eli, 'Ну и денёк! В базарный день сюда съезжаются со всех окрестных деревень. У твоей двери я насчитал человек двадцать.'),
        entry('Игрок', portrait.player, 'В деревне все лица были знакомые. А тут глаз от коробок не поднять. Ещё и всё, что мы обустроили, осталось в старом пункте.'),
        entry('Илья', portrait.eli, 'Вдвоём такой поток не удержать. У нас многие ищут работу. Повесь объявление, и к вечеру будет из кого выбрать.'),
        entry('Рассказчик', portrait.narrator, 'В городке команда может принять ещё одного человека. А когда клиенты ждут слишком долго, выручают кулер и другие удобства из магазина.')
      ],
      en: [
        entry('Eli', portrait.eli, 'What a day! On market days people come in from every village around. I counted about twenty at your door.'),
        entry('You', portrait.player, 'Back in the village, every face was familiar. Here I can barely look up from the boxes. And everything we set up stayed behind at the old place.'),
        entry('Eli', portrait.eli, 'Two people can’t handle a crowd like that. Plenty of folks here are looking for work. Put up a notice, and you’ll have candidates by evening.'),
        entry('Narrator', portrait.narrator, 'In town, the team has room for one more person. And when customers wait too long, a water cooler and other comforts from the shop help them stay patient.')
      ]
    },
    town_village_news: {
      ru: [
        entry('Лёва', portrait.leo, 'Тебе письмо! Точнее, записка на коробке. Анна просила передать лично в руки и проследить, чтобы прочитали.'),
        entry('Записка от Анны', portrait.anna, 'У нас всё хорошо. Соседи уже привыкли, что посылки совсем рядом. Дед Семён поймал на новую удочку щуку и всем показывает фото.'),
        entry('Игрок', portrait.player, 'Значит, пункт работает и без меня. Лёва, передай, что в городке у нас тоже появились постоянные клиенты. И что я скучаю по её чаю.'),
        entry('Лёва', portrait.leo, 'Передам. А ты держи рейтинг: на рынке про ваш пункт уже говорят, и пока только хорошее.')
      ],
      en: [
        entry('Leo', portrait.leo, 'You’ve got mail! Well, a note taped to a box. Anna told me to hand it over in person and make sure you read it.'),
        entry('Anna’s note', portrait.anna, 'All is well here. The neighbors are used to having their packages close by. Old Simon caught a pike with his new fishing rod and shows everyone the photo.'),
        entry('You', portrait.player, 'So the place runs fine without me. Leo, tell her we’re getting regulars here in town, too. And that I miss her tea.'),
        entry('Leo', portrait.leo, 'Will do. Keep that rating up: people at the market are talking about your place, and so far it’s all good.')
      ]
    },
    town_basement_1:{ru:[entry('Илья',portrait.eli,'Слышишь шуршание? Под магазином старый подвал. Давно никто туда не спускался.'),entry('Игрок',portrait.player,'Похоже, забытые посылки решили сами выйти на прогулку. Спустимся и вернём их на место!')],en:[entry('Eli',portrait.eli,'Hear that rustling? There is an old basement below the shop. Nobody has been down there for years.'),entry('You',portrait.player,'Looks like some forgotten parcels went for a walk. Let’s bring them back!')]},
    town_repair_1:{ru:[entry('Илья',portrait.eli,'Коридор свободен! Теперь у нас собственное помещение, и мы можем постепенно его улучшать. Каждый ремонт даст нам новое преимущество в работе.'),entry('Игрок',portrait.player,'Начнём со входа: уютная скамья для гостей, экспресс-окно или приоритет возвратов. Выберем то, что лучше подойдёт нашему ПВЗ.')],en:[entry('Eli',portrait.eli,'The corridor is clear! Now that we own the premises, we can improve them step by step. Every renovation will give us a new advantage at work.'),entry('You',portrait.player,'Let’s start with the entrance: a cozy bench for visitors, an express counter, or returns priority. We’ll choose what suits our pickup point best.')]},
    town_repair_2:{ru:[entry('Илья',portrait.eli,'У стойки всё больше заказов. Проверочный стол сбережёт от ошибок, терминал поможет выбрать гостя, а стол комплектования — собрать заказы.'),entry('Игрок',portrait.player,'Выберем, что подходит нашему стилю работы.')],en:[entry('Eli',portrait.eli,'Orders are piling up. A checking desk prevents mistakes, a call terminal locates customers, and a packing table helps collect orders.'),entry('You',portrait.player,'Let’s choose what suits our working style.')]},
    town_basement_2:{ru:[entry('Лёва',portrait.leo,'Привёз фонарь. За дальней дверью целый склад, но там кто-то таскает коробки.'),entry('Игрок',portrait.player,'Наверное, мыши и моль. Зажжём свет и вернём потерянные посылки.')],en:[entry('Leo',portrait.leo,'I brought a lantern. There is a storeroom behind the far door, but someone is dragging boxes around.'),entry('You',portrait.player,'Probably mice and moths. Let’s turn on the lights and save the parcels.')]},
    town_repair_3:{ru:[entry('Илья',portrait.eli,'Столько свободного места! Можно сохранить заказы на завтра, поставить полку у стойки или освободить пол грузовой клеткой.'),entry('Игрок',portrait.player,'Хорошо, теперь выберем, как использовать подвал.')],en:[entry('Eli',portrait.eli,'So much space! We could save orders overnight, add a quick-access shelf, or clear the floor with a cargo cage.'),entry('You',portrait.player,'Let’s decide how to use the basement.')]},
    town_repair_4:{ru:[entry('Лёва',portrait.leo,'Возвраты снова мешают пройти. Сделаем отдельный стол, стойку или секции под следующую доставку?'),entry('Игрок',portrait.player,'Нужно организовать возвраты так, чтобы не загромождать проходы.')],en:[entry('Leo',portrait.leo,'Returns are blocking the passages again. A special desk, a rack, or outbound compartments?'),entry('You',portrait.player,'Let’s organize returns without cluttering the walkways.')]},
    town_basement_3:{ru:[entry('Лёва',portrait.leo,'Остался последний отсек — старая упаковочная. Видел, как одна коробка моргнула!'),entry('Игрок',portrait.player,'Ого, мимики! Включим лампы, достанем посылки и не будем подходить слишком близко.')],en:[entry('Leo',portrait.leo,'One room left — the old packing room. I swear one box winked at me!'),entry('You',portrait.player,'Mimics! Let’s switch on the lamps, save the parcels, and keep our distance.')]},
    town_repair_5:{ru:[entry('Игрок',portrait.player,'Подвал расчищен, даже нашли старую вывеску! Осталось благоустроить двор.'),entry('Илья',portrait.eli,'Навес поможет гостям, доска — подготовиться к доставке, а тележка — разгружать фургон. Решать тебе.')],en:[entry('You',portrait.player,'The basement is clear, and we even found the old sign! Only the yard remains.'),entry('Eli',portrait.eli,'A porch helps customers, a dispatch board helps planning, and a cart helps unloading. Your choice.')]},
    town_final: {
      ru: [
        entry('Илья', portrait.eli, 'Сегодня у фонтана меня спросили, где ваш пункт. Я даже рта не успел открыть, а трое прохожих уже показали на вашу дверь.'),
        entry('Лёва', portrait.leo, 'Вот бы это услышала Анна! Кстати, мне звонила коллега из большого города. Спрашивала, как у вас тут дела. Будет что ей рассказать.'),
        entry('Рассказчик', portrait.narrator, 'Здесь я пока закрою карту. В большом городе есть адрес, который я помню до последней цифры. Как-нибудь расскажу почему.')
      ],
      en: [
        entry('Eli', portrait.eli, 'Someone stopped me by the fountain today to ask where your pickup point was. Before I could answer, three people pointed at your door.'),
        entry('Leo', portrait.leo, 'I wish Anna could have heard that! A friend from the delivery service in the big city called to ask how things are going here. Now I’ve got a story for her.'),
        entry('Narrator', portrait.narrator, 'I’ll fold up the map here for now. There’s an address in the big city I remember down to the last digit. Someday I’ll tell you why.')
      ]
    },
    city_arrival: {
      ru: [
        entry('Лёва', portrait.leo, 'Вот мы и в городе! Знакомься, это Ника, моя коллега из местной службы доставки.'),
        entry('Игрок', portrait.player, 'Привет, Ника! Мы собираемся открыть здесь пункт выдачи. Не знаешь, где поискать помещение?'),
        entry('Ника', portrait.nika, 'Привет! Рядом с остановкой есть свободное помещение. Пойдём покажу — возможно, оно вам подойдёт.'),
        entry('Лёва', portrait.leo, 'Отлично! Я пока вернусь к доставкам. Если понадобится помощь с посылками, знаете, где меня найти.')
      ],
      en: [
        entry('Leo', portrait.leo, 'Here we are in the city! This is Nika, my colleague from the local delivery service.'),
        entry('You', portrait.player, 'Hi, Nika! We’re planning to open a pickup point here. Do you know where we could find a place?'),
        entry('Nika', portrait.nika, 'Hi! There’s an empty space near the transit stop. Come on, I’ll show you — it might be just what you need.'),
        entry('Leo', portrait.leo, 'Great! I’ll get back to my deliveries. If you need help with packages, you know where to find me.')
      ]
    },
    city_promotion: {
      ru: [
        entry('Игрок', portrait.player, 'Мы открылись в большом городе, а посетителей пока совсем немного. Как о нас узнают?'),
        entry('Ника', portrait.nika, 'Точке нужна реклама. В этом районе местный блогер советует людям интересные места — давай пригласим его.'),
        entry('Блогер', portrait.cityBlogger, 'Я прихожу только в пункты с рейтингом не ниже 4,8 звезды. Сначала покажите, как вы заботитесь о посетителях.'),
        entry('Игрок', portrait.player, 'Договорились! Поднимем рейтинг до 4,8 звезды, а потом будем ждать тебя.')
      ],
      en: [
        entry('You', portrait.player, 'We opened in a big city, but hardly anyone has stopped by. How do we get the word out?'),
        entry('Nika', portrait.nika, 'We need to promote the pickup point. A local blogger recommends places around here — let’s invite them.'),
        entry('Blogger', portrait.cityBlogger, 'I only visit pickup points rated at least 4.8 stars. Show me how you look after your customers first.'),
        entry('You', portrait.player, 'Deal! We’ll reach 4.8 stars, then look forward to your visit.')
      ]
    },
    city_courier_intro: {
      ru: [
        entry('Ника', portrait.nika, 'Выручишь? Четыре посылки нужно развезти по пунктам выдачи. На одних улицах пробки, другие и вовсе перекрыты.'),
        entry('Игрок', portrait.player, 'Сначала отмечу на карте все четыре адреса. Потом возьму рюкзак и побегу по маршруту.')
      ],
      en: [
        entry('Nika', portrait.nika, 'Could you help me out? Four parcels need to reach their pickup points. Some streets are jammed, and others are closed.'),
        entry('You', portrait.player, 'I’ll mark all four addresses on the map first. Then I’ll grab my backpack and run the route.')
      ]
    },
    city_courier_done: {
      ru: [entry('Ника', portrait.nika, 'Все четыре посылки на месте. Спасибо! Я приму их в системе, а ты можешь вернуться в свой пункт.')],
      en: [entry('Nika', portrait.nika, 'All four parcels made it. Thanks! I’ll check them in while you get back to your pickup point.')]
    },
    city_technology: {
      ru: [
        entry('Ника', portrait.nika, 'Техника не стоит на месте. Уже появляются роботы-сортировщики и искусственный интеллект для пунктов выдачи.'),
        entry('Игрок', portrait.player, 'Говорят, в некоторых странах люди уже почти ничего не делают сами — рутину поручают машинам.'),
        entry('Ника', portrait.nika, 'Люди всё равно нужны, но помощник может взять на себя часть выдачи. Посмотрим, как подключить ИИ?'),
        entry('Игрок', portrait.player, 'Давай! Узнаем, что он умеет и сколько стоит.')
      ],
      en: [
        entry('Nika', portrait.nika, 'Technology keeps moving. Sorting robots and AI assistants are already appearing at pickup points.'),
        entry('You', portrait.player, 'I’ve heard that in some countries people hardly do routine work themselves anymore — machines handle it.'),
        entry('Nika', portrait.nika, 'People still matter, but an assistant can take over some deliveries. Shall we find out how to get an AI?'),
        entry('You', portrait.player, 'Let’s do it! We’ll check what it can do and how much it costs.')
      ]
    },
    city_ai_meeting: {
      ru: [
        entry('ИИ', portrait.narrator, 'Привет! Теперь я в вашей команде.'),
        entry('Игрок', portrait.player, 'Привет! Чем ты сможешь помочь?'),
        entry('ИИ', portrait.narrator, 'Со следующей смены я буду выдавать посылки в крайнем правом окне. И подскажу, как развивать пункт.'),
        entry('Рассказчик', portrait.narrator, 'Вот так мы и познакомились. Это я рассказывал тебе историю о деревне — только из будущего.')
      ],
      en: [
        entry('AI', portrait.narrator, 'Hello! I’m part of your team now.'),
        entry('You', portrait.player, 'Hi! How can you help?'),
        entry('AI', portrait.narrator, 'Starting next shift, I’ll hand out parcels at the rightmost window and offer tips for growing the pickup point.'),
        entry('Narrator', portrait.narrator, 'And that’s how we met. I’m the one who told you about the village — just from the future.')
      ]
    },
    city_center_arrival: {
      ru: [
        entry('Ника', portrait.nika, 'Мы хорошо поработали на окраине. Вот новое помещение в центре — команда, оборудование и все посылки уже здесь.'),
        entry('Игрок', portrait.player, 'Здесь людей ещё больше. Как сделать так, чтобы очередь не мешала тем, кто пришёл за одной посылкой?'),
        entry('Ника', portrait.nika, 'Рядом с посетителями можно поставить постамат. Курьер сам загрузит назначенные заказы, а клиенты заберут свои.'),
        entry('ИИ', portrait.narrator, 'Если ячеек не хватит, заказ попадёт к обычному окну. Постамат можно купить в магазине — попробуем первую выдачу?'),
        entry('Игрок', portrait.player, 'Поработаем две смены в центре. Если у окон начнёт собираться очередь, подумаем о постамате.')
      ],
      en: [
        entry('Nika', portrait.nika, 'We did well on the outskirts. Here is our new place downtown — the team, equipment and parcels are already here.'),
        entry('You', portrait.player, 'There are even more people here. How can we keep the line from slowing down someone collecting a single parcel?'),
        entry('Nika', portrait.nika, 'We can put a parcel locker near the customers. A courier loads assigned orders, and customers collect their own.'),
        entry('AI', portrait.narrator, 'If there are no free compartments, the order goes to a regular window. You can buy the locker in the shop. Shall we try a pickup?'),
        entry('You', portrait.player, 'Let’s run two shifts downtown. If the lines build up, we can add a locker.')
      ]
    },
    city_departure: {
      ru: [
        entry('Ника', portrait.nika, 'О нашем пункте теперь знают во всём районе. В столице освободилось помещение — хочешь попробовать?'),
        entry('Игрок', portrait.player, 'Давай! Оставим мегаполис в надёжных руках и возьмём с собой одного сотрудника.'),
        entry('ИИ', portrait.narrator, 'Я останусь на связи. Впереди у нас новая задача: научиться управлять сетью.')
      ],
      en: [
        entry('Nika', portrait.nika, 'People across the neighborhood know our pickup point now. A place has opened up in the capital — want to try it?'),
        entry('You', portrait.player, 'Let’s go! We’ll leave the city point in good hands and take one employee with us.'),
        entry('AI', portrait.narrator, 'I’ll stay in touch. Our next challenge is learning to run a network.')
      ]
    },
    city_sorting_intro: {
      ru: [
        entry('Ника', portrait.nika, 'Перед отъездом в столицу выручишь наш сортировочный центр? Остались обычные посылки, возвраты и несколько завалов.'),
        entry('ИИ', portrait.narrator, 'Собирай совпадающие коробки по цвету и знаку. В каждой из трёх партий сначала можно потренироваться, а затем выполнить настоящие задачи.'),
        entry('Игрок', portrait.player, 'Разберём всё, чтобы поездка в столицу началась без незаконченных дел.')
      ],
      en: [
        entry('Nika', portrait.nika, 'Before we leave for the capital, can you help our sorting centre? We still have ordinary parcels, returns and a few piles to clear.'),
        entry('AI', portrait.narrator, 'Match parcels by colour and symbol. Each of the three rounds begins with practice, then you can complete the real objectives.'),
        entry('You', portrait.player, 'Let’s get everything sorted so we can leave for the capital with no unfinished business.')
      ]
    },
    city_sorting_done: {
      ru: [
        entry('Ника', portrait.nika, 'Отлично! Все три партии завершены: посылки отсортированы, возвраты отправлены, а завалы разобраны.'),
        entry('ИИ', portrait.narrator, 'Теперь можно спокойно отправляться в столицу. Выбери сотрудника, который поедет с тобой.')
      ],
      en: [
        entry('Nika', portrait.nika, 'Excellent! All three rounds are complete: the parcels are sorted, returns sent and piles cleared.'),
        entry('AI', portrait.narrator, 'Now we can head to the capital. Choose the employee who will come with you.')
      ]
    },
    capital_arrival: {
      ru: [
        entry('Ника', portrait.nika, 'Добро пожаловать в столицу! Начнём с пункта на окраине, а когда подготовимся, откроем второй в центре.'),
        entry('Игрок', portrait.player, 'А как же ИИ? Его терминал остался в мегаполисе.'),
        entry('ИИ', portrait.narrator, 'Терминал остался там, но я на связи и продолжу помогать советами. Для выдачи здесь понадобится новый терминал.'),
        entry('Ника', portrait.nika, 'Для первой смены нового пункта обязательно найми и назначь кассира и грузчика. В команде новой точки обе роли должны быть заняты.')
      ],
      en: [
        entry('Nika', portrait.nika, 'Welcome to the capital! We’ll start on the outskirts and open a second point downtown when we’re ready.'),
        entry('You', portrait.player, 'What about the AI? Its terminal stayed at the city pickup point.'),
        entry('AI', portrait.narrator, 'The terminal stayed there, but I’m still in touch and will keep giving advice. To hand out packages here, I’ll need a new terminal.'),
        entry('Nika', portrait.nika, 'Before the new point can start its first shift, hire and assign both a cashier and a loader. The new team needs both roles filled.')
      ]
    },
    capital_final: {
      ru: [
        entry('Ника', portrait.nika, 'Окраина и центр справляются! А Лёва передал записку из деревни — прямо на коробке.'),
        entry('Записка от Анны', portrait.anna, 'Мы с Машей видели новости о твоих пунктах. Кто бы подумал, что всё начнётся с моих пуговиц! Заезжай на чай.'),
        entry('Игрок', portrait.player, 'Обязательно заеду. И спасибо всем, кто помог нам пройти этот путь.'),
        entry('ИИ', portrait.narrator, 'Всё началось с желания помочь соседям. Теперь посмотри, какую сеть мы построили вместе!')
      ],
      en: [
        entry('Nika', portrait.nika, 'The outskirts and downtown are both running well! Leo brought a note from the village, taped right to a box.'),
        entry('Anna’s note', portrait.anna, 'Maya and I saw the news about your pickup points. Who would have thought it all started with my buttons? Come visit for tea.'),
        entry('You', portrait.player, 'I will. And thank you to everyone who helped us get this far.'),
        entry('AI', portrait.narrator, 'It started with a wish to help the neighbors. Look at the network we built together!')
      ]
    },
    city_ai_tip_team: {
      ru: [entry('ИИ', portrait.narrator, 'Если поток растёт, распределяй задачи между сотрудниками: разгрузка, сортировка и выдача. Роли можно поменять в разделе команды.')],
      en: [entry('AI', portrait.narrator, 'As traffic grows, divide unloading, sorting and counter service among your staff. You can change their roles in the team section.')]
    },
    city_ai_tip_queue: {
      ru: [entry('ИИ', portrait.narrator, 'Следи за терпением посетителей. Кулер и другие удобства из магазина помогут им подождать немного дольше.')],
      en: [entry('AI', portrait.narrator, 'Keep an eye on customer patience. A water cooler and other comforts from the shop can help people wait longer.')]
    },
    city_ai_tip_cash: {
      ru: [entry('ИИ', portrait.narrator, 'Оставляй запас в кассе на аренду и зарплаты. Тогда новая покупка не помешает открыть следующую смену.')],
      en: [entry('AI', portrait.narrator, 'Keep some cash for rent and wages, so a new purchase doesn’t get in the way of the next shift.')]
    },
    city_ai_tip_orders: {
      ru: [entry('ИИ', portrait.narrator, 'Перед выдачей сверь цвет и форму посылки с заказом. Точность помогает сохранить деньги и доверие посетителей.')],
      en: [entry('AI', portrait.narrator, 'Before handing over a parcel, check its color and shape against the order. Accuracy protects both cash and customer trust.')]
    }
  };
  for (const content of Object.values(scene)) {
    Object.freeze(content.ru);
    Object.freeze(content.en);
    Object.freeze(content);
  }
  Object.freeze(scene);
  const ids = Object.freeze(Object.keys(scene));
  const empty = Object.freeze([]);
  return Object.freeze({
    ids,
    scene(id, lang) { return scene[id]?.[lang === 'ru' ? 'ru' : 'en'] || empty; }
  });
})();
