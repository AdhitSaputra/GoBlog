const mineflayer = require('mineflayer')
const cmd = require('mineflayer-cmd').plugin
const readline = require('readline');
const fs = require('fs');
let rawdata = fs.readFileSync('config.json');
const http = require("http")
const pvp = require('mineflayer-pvp').plugin
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const armorManager = require('mineflayer-armor-manager')
const { mineflayer: mineflayerViewer } = require('prismarine-viewer')
const inventoryViewer = require('mineflayer-web-inventory')
const path = require("path");
const { prototype } = require('module');
let data = JSON.parse(rawdata);
var lasttime = -1;
var moving = 1;
var connected = 0;
var actions = ['forward', 'back', 'left', 'right', 'jump', 'sneak']
var lastaction;
var pi = 3.14159;
var moveinterval = 1;
var maxrandom = 2;
var host = data["ip"];
var password = data["password"]
var username = data["name"]
var nightskip = "false"
var loginmessage = "Bot Has Been Logged In"
var prefix = "!"
var webserverport = data["webserverport"]
console.log('Minecraft Bot was running.')
client()

function client() {
  var bot = mineflayer.createBot({
    host: host,
    username: username,
  });
  
  
  function getRandomArbitrary(min, max) {
      return Math.random() * (max - min) + min;
  }

  function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  bot.on('login', function() {
    console.log("Loggin In")
    bot.chat(loginmessage)
  })
  
  bot.once('spawn', () => {
    connected = 1
    mineflayerViewer(bot, { port: webserverport, firstPerson: true })
    console.log('Web Server is on https://localhost:8080')
  })
  
  bot.on('time', function() {
      if (connected < 1) {
          return;
      }
      if (lasttime < 0) {
          lasttime = bot.time.age;
      } else {
          var randomadd = Math.random() * maxrandom * 20;
          var interval = moveinterval * 20 + randomadd;
          if (bot.time.age - lasttime > interval) {
              {
                  var yaw = Math.random() * pi - (0.5 * pi);
                  var pitch = Math.random() * pi - (0.5 * pi);
                  bot.look(yaw, pitch, false);
                  lastaction = actions[Math.floor(Math.random() * actions.length)];
                  bot.setControlState(lastaction, true);
                  moving = 1;
                  lasttime = bot.time.age;
                  bot.activateItem();
              }
          }
      }
  });
  
  bot.loadPlugin(pvp)
  bot.loadPlugin(armorManager)
  bot.loadPlugin(pathfinder)
  
  
  bot.on('playerCollect', (collector, itemDrop) => {
      if (collector !== bot.entity) return
  
      setTimeout(() => {
          const sword = bot.inventory.items().find(item => item.name.includes('sword'))
          if (sword) bot.equip(sword, 'hand')
      }, 150)
  })
  
  bot.on('playerCollect', (collector, itemDrop) => {
      if (collector !== bot.entity) return
  
      setTimeout(() => {
          const shield = bot.inventory.items().find(item => item.name.includes('shield'))
          if (shield) bot.equip(shield, 'off-hand')
      }, 250)
  })
  
  let guardPos = null
  
  function guardArea(pos) {
      guardPos = pos.clone()
  
      if (!bot.pvp.target) {
          moveToGuardPos()
      }
  }
  
  function stopGuarding() {
      guardPos = null
      bot.pvp.stop()
      bot.pathfinder.setGoal(null)
  }
  
  function moveToGuardPos() {
      const mcData = require('minecraft-data')(bot.version)
      bot.pathfinder.setMovements(new Movements(bot, mcData))
      bot.pathfinder.setGoal(new goals.GoalBlock(guardPos.x, guardPos.y, guardPos.z))
  }
  
  bot.on('stoppedAttacking', () => {
      if (guardPos) {
          moveToGuardPos()
      }
  })
  
  bot.on('physicTick', () => {
      if (bot.pvp.target) return
      if (bot.pathfinder.isMoving()) return
  
      const entity = bot.nearestEntity()
      if (entity) bot.lookAt(entity.position.offset(0, entity.height, 0))
  })
  
  bot.on('physicTick', () => {
      if (!guardPos) return
  
      const filter = e => e.type === 'mob' && e.position.distanceTo(bot.entity.position) < 16 &&
          e.mobType !== 'Armor Stand'
  
      const entity = bot.nearestEntity(filter)
      if (entity) {
          bot.pvp.attack(entity)
      }
  })
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}guard`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("I can't see you.")
              return
          }
  
          bot.chat('I will guard that location.')
          guardArea(player.entity.position)
      }
  
      if (message === `${prefix}fight me`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("I can't see you.")
              return
          }
  
          bot.chat('Prepare to fight!')
          bot.pvp.attack(player.entity)
      }
  
      if (message === `${prefix}stop`) {
          bot.chat('I will no longer guard this area.')
          stopGuarding()
      }
  })
  
  
  bot.on('chat', (username, message) => {
      if (username === bot.username) return
      switch (message) {
          case `${prefix}sleep`:
              goToSleep()
              break
          case `${prefix}wakeup`:
              wakeUp()
              break
      }
  })
  
  bot.on(`${prefix}sleep`, () => {
      bot.chat('Good night!')
  })
  bot.on(`${prefix}wake`, () => {
      bot.chat('Good morning!')
  })
  
  async function goToSleep() {
      const bed = bot.findBlock({
          matching: block => bot.isABed(block)
      })
      if (bed) {
          try {
              await bot.sleep(bed)
              bot.chat("I'm sleeping")
          } catch (err) {
              bot.chat(`I can't sleep: ${err.message}`)
          }
      } else {
          bot.chat('No nearby bed')
      }
  }
  
  async function wakeUp() {
      try {
          await bot.wake()
      } catch (err) {
          bot.chat(`I can't wake up: ${err.message}`)
      }
  }
  
  
  bot.on('chat', (username, message) => {
      if (message === 'hello') {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("hi")
              return
          }
  
          bot.chat('hi')
  
      }
  })
  
  
  
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}td`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("/time set day")
              return
          }
  
  
          bot.chat('/time set day')
  
  
      }
  })
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}tm`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("/time set midnight")
              return
          }
  
  
          bot.chat('/time set midnight')
  
  
      }
  })
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}tn`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("/time set noon")
              return
          }
  
  
          bot.chat('/time set noon')
  
  
      }
  })
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}wr`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("/weather rain")
              return
          }
  
  
          bot.chat('/weather rain')
  
  
      }
  })
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}wc`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("/weather clear")
              return
          }
  
  
          bot.chat('/weather clear')
  
  
      }
  })
  
  
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}tni`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("/time set night")
              return
          }
  
          bot.chat('/time set night')
  
      }
  })
  
  bot.on('chat', (username, message) => {
      if (message === `${prefix}wt`) {
          const player = bot.players[username]
  
          if (!player) {
              bot.chat("/weather thunder")
              return
          }
  
          bot.chat('/weather thunder')
  
      }
  
  })
  
  bot.on('death', function() {
      bot.emit("respawn")
  });
  
  bot.on('kicked', console.log)
  bot.on('error', console.log)
  bot.on('end', async res => {
    console.log('Reconnect to server in 5 seconds')
    await timeout(5000)
    if (connected > 0) {
      bot.viewer.close()
      connected = 0
    }
    client()
  })
}

