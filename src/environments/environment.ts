// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  desktop: false,
  currency: {
    id: 'nano',
    name: 'Nano',
    ticker: 'NANO',
    precision: 30,
    maxSupply: 133248289,
    prefix: 'nano',
    supportsMyNanoNinja: true,
    ledgerWalletPrefix: `44'/165'/`,
  },
  backends: [
    {
      name: 'My Nano Ninja',
      value: 'ninja',
      api: 'https://mynano.ninja/api/node',
      ws: 'wss://ws.mynano.ninja',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Nanos.cc',
      value: 'nanos',
      api: 'https://nault.nanos.cc/proxy',
      ws: 'wss://nault-ws.nanos.cc',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'VoxPopuli',
      value: 'voxpopuli',
      api: 'https://vox.nanos.cc/api',
      ws: 'wss://vox.nanos.cc/websocket',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'PowerNode',
      value: 'powernode',
      api: 'https://proxy.powernode.cc/proxy',
      ws: 'wss://ws.powernode.cc',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Rainstorm City',
      value: 'rainstorm',
      api: 'https://rainstorm.city/api',
      ws: 'wss://rainstorm.city/websocket',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Nanex.cc',
      value: 'nanex',
      api: 'https://api.nanex.cc',
      ws: null,
      auth: null,
      shouldRandom: false,
    },
    {
      name: 'NanoCrawler',
      value: 'nanocrawler',
      api: 'https://vault.nanocrawler.cc/api/node-api',
      ws: null,
      auth: null,
      shouldRandom: false,
    },
  ],
  representativeAccounts: [
    'nano_1center16ci77qw5w69ww8sy4i4bfmgfhr81ydzpurm91cauj11jn6y3uc5y', // The Nano Center
    'nano_1x7biz69cem95oo7gxkrw6kzhfywq4x5dupw4z1bdzkb74dk9kpxwzjbdhhs', // NanoCrawler
    'nano_1zuksmn4e8tjw1ch8m8fbrwy5459bx8645o9euj699rs13qy6ysjhrewioey', // Nanowallets.guide
    'nano_3chartsi6ja8ay1qq9xg3xegqnbg1qx76nouw6jedyb8wx3r4wu94rxap7hg', // Nano Charts
    'nano_1ninja7rh37ehfp9utkor5ixmxyg8kme8fnzc4zty145ibch8kf5jwpnzr3r', // My Nano Ninja
    'nano_1iuz18n4g4wfp9gf7p1s8qkygxw7wx9qfjq6a9aq68uyrdnningdcjontgar', // NanoTicker / Json
    'nano_3power3gwb43rs7u9ky3rsjp6fojftejceexfkf845sfczyue4q3r1hfpr3o', // PowerNode
  ],
  defaultRepresentatives: [
    {
      id: 'nano_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4',
      name: 'Nano Foundation #1',
      warn: true,
    },
    {
      id: 'nano_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou',
      name: 'Nano Foundation #2',
      warn: true,
    },
    {
      id: 'nano_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p',
      name: 'Nano Foundation #3',
      warn: true,
    },
    {
      id: 'nano_3dmtrrws3pocycmbqwawk6xs7446qxa36fcncush4s1pejk16ksbmakis78m',
      name: 'Nano Foundation #4',
      warn: true,
    },
    {
      id: 'nano_3hd4ezdgsp15iemx7h81in7xz5tpxi43b6b41zn3qmwiuypankocw3awes5k',
      name: 'Nano Foundation #5',
      warn: true,
    },
    {
      id: 'nano_1awsn43we17c1oshdru4azeqjz9wii41dy8npubm4rg11so7dx3jtqgoeahy',
      name: 'Nano Foundation #6',
      warn: true,
    },
    {
      id: 'nano_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs',
      name: 'Nano Foundation #7',
      warn: true,
    },
    {
      id: 'nano_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1',
      name: 'Nano Foundation #8',
      warn: true,
    },
  ],
  donationAddress: 'nano_3niceeeyiaa86k58zhaeygxfkuzgffjtwju9ep33z9c8qekmr3iuc95jbqc8',
};
