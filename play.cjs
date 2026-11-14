'use strict';

const simulation = require('./event-sim');
const { proposeEvent } = require('./event-sim-ai.cjs');
const { config, textConnection, isConfigured, createProviderFactory } = require('./ai-provider.cjs');

async function main() {
  const args = process.argv.slice(2);
  const useAi = args[0] === '--ai';
  const direction = args.slice(useAi ? 1 : 0).join(' ') || 'Keep this private and talk to them first.';
  let state = simulation.fresh({ seed: 'storm' });
  console.log('Day 1:', state.group.name, '—', simulation.activeEvent(state).title);
  console.log('Your direction:', direction);

  if (useAi) {
    const settings = config(__dirname);
    const connection = textConnection(settings, settings.AI_DRAFT_PROVIDER || settings.AI_CHAT_PROVIDER);
    if (!isConfigured(connection)) {
      throw new Error('Choose an AI provider and fill in its settings in .env.local. See README.md.');
    }
    console.log('Draft provider:', connection.name, '(' + connection.model + ')');
    const provider = createProviderFactory()(connection);
    const result = await proposeEvent({ sim: state, text: direction }, provider, connection.model, connection.name);
    state = result.sim;
  } else {
    simulation.propose(state, direction);
  }

  console.log('Draft:', state.pending.approach, '—', state.pending.intent);
  simulation.confirm(state);
  simulation.advance(state);

  const saved = simulation.restore(JSON.stringify(state));
  if (!saved || saved.day !== 2) throw new Error('The Day 2 save could not be restored.');
  console.log('Day 2:', simulation.activeEvent(saved).title);
  console.log('Public stats:', JSON.stringify(saved.public));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
