const { REST, Routes } = require('discord.js');

const commands = [
  {
    name: 'ping',
    description: 'Replies with Pong!'
  }
];

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');

    await rest.put(
      Routes.applicationGuildCommands(
        '1474489638931661021', // حط Application ID متاعك
        '1461091014906220689'        // حط Server ID متاعك
      ),
      { body: commands }
    );

    console.log('Slash commands registered successfully!');
  } catch (error) {
    console.error(error);
  }
})();
