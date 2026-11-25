// Shared static game catalogs. Entries retain their original order because
// saved staff name indices and upgrade IDs depend on it.
globalThis.PptCatalog = {
  COL:['#e5483d','#3b7de3','#f3c934','#38b26a'],
  COLD:['#99291f','#1f4f9a','#a3801a','#1f6e45'],
  SHIRTS:['#8e6cd8','#d86c9e','#5bb6c9','#c9a25b','#6c8ed8','#a7c95b'],
  AIC:'#5bd6ff',
  SHOP:[
    {id:'shoes',cat:'staff',p:[100,220,450],d:1},{id:'cart',cat:'staff',p:[200,500],d:2},{id:'scanner',cat:'staff',p:[250],d:2},{id:'xlcart',cat:'staff',p:[300],d:1},{id:'staffroom',cat:'staff',p:[300,700],d:12},
    {id:'queue',cat:'storage',p:[200,450],d:2},{id:'shelves',cat:'storage',p:[150,350],d:2},{id:'conveyor',cat:'storage',p:[250],d:3},{id:'returns',cat:'storage',p:[200],d:5},{id:'coldspace',cat:'storage',p:[200],d:1},{id:'warehouse',cat:'storage',p:[500],d:5},{id:'locker',cat:'storage',p:[600],d:26},
    {id:'robot',cat:'auto',p:[350],d:3},{id:'tune',cat:'auto',p:[350],d:3,req:'robot'},{id:'ai',cat:'auto',p:[700,500],d:6,d2:10},
    {id:'brand',cat:'growth',p:[1000,2000,4000,8000,16000],d:15},{id:'cooler',cat:'comfort',part:'waiting',p:[80],d:1},{id:'coffee',cat:'comfort',part:'waiting',p:[150],d:2},{id:'tv',cat:'comfort',part:'waiting',p:[250],d:4}],
  NAMES:{ru:['Аня','Борис','Вика','Гоша','Даша','Егор','Жанна','Илья','Катя','Лёша','Маша','Нурлан','Оля','Петя','Рита','Саша','Тимур','Уля','Фёдор','Юля'],
    en:['Anya','Boris','Vika','Gosha','Dasha','Egor','Zhanna','Ilya','Katya','Lyosha','Masha','Nurlan','Olya','Petya','Rita','Sasha','Timur','Ulya','Fyodor','Yulia']},
  TRAITS:['fast','careful','strong','chatty','rookie','sleepy'],
  ROLE_COL:{load:'#b07a3c',sort:'#9b6cd8',cash:'#2fae9c'}
};
