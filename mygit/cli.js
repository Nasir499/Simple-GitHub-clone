#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { initRepo } from './commands/init.js';
import { addRepo } from './commands/add.js';
import { commitRepo } from './commands/commit.js';
import { pushRepo } from './commands/push.js';
import { pullRepo } from './commands/pull.js';
import { revertRepo } from './commands/revert.js';
import { loginRepo } from './commands/login.js';

yargs(hideBin(process.argv))
  .scriptName('mygit')
  .usage('$0 <command> [args]')
  .command(
    'login <username> <password>',
    'Log in to your account and save global credentials',
    (yargs) => {
      yargs
        .positional('username', {
          describe: 'Your username or email',
          type: 'string'
        })
        .positional('password', {
          describe: 'Your account password',
          type: 'string'
        });
    },
    (argv) => {
      loginRepo(argv.username, argv.password);
    }
  )
  .command(
    'init [repoId]',
    'Initialize the project with optional Repository ID',
    (yargs) => {
      yargs.positional('repoId', {
        describe: 'The Repository ID from the web app',
        type: 'string'
      });
    },
    (argv) => {
      initRepo(argv.repoId);
    }
  )
  .command(
    'add <file>',
    'Add a new file or directory to staging area',
    (yargs) => {
      yargs.positional('file', {
        describe: 'The file or directory path to add to staging area (use "." for all)',
        type: 'string'
      });
    },
    (argv) => {
      addRepo(argv.file);
    }
  )
  .command(
    'commit <message>',
    'Commit the staged files',
    (yargs) => {
      yargs.positional('message', {
        describe: 'The commit message',
        type: 'string'
      });
    },
    (argv) => {
      commitRepo(argv.message);
    }
  )
  .command(
    'push',
    'Push committed files to remote repository via backend API',
    {},
    pushRepo
  )
  .command(
    'pull',
    'Pull latest changes from remote repository',
    {},
    pullRepo
  )
  .command(
    'revert <commitId>',
    'Revert working directory to a specific commit',
    (yargs) => {
      yargs.positional('commitId', {
        describe: 'The commit ID to revert',
        type: 'string'
      });
    },
    (argv) => {
      revertRepo(argv.commitId);
    }
  )
  .demandCommand(1, 'You need at least one command before moving on')
  .help()
  .argv;
