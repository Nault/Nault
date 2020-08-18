// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  desktop: false,
  currency: {
    id: 'banano',
    name: 'Banano',
    ticker: 'BAN',
    precision: 29,
    maxSupply: 3402823669.2,
    prefix: 'ban',
    supportsMyNanoNinja: false
  },
  backends: [
    {
      name: 'AppDitto',
      value: 'appditto',
      api: 'https://kaliumapi.appditto.com/api',
      ws: null,
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'BananoVault',
      value: 'bananovault',
      api: 'https://vault.banano.cc/api/node-api',
      ws: 'wss://ws.banano.cc/',
      auth: null,
      shouldRandom: false,
    },
  ],
  representativeAccounts: [
    'ban_1cake36ua5aqcq1c5i3dg7k8xtosw7r9r7qbbf5j15sk75csp9okesz87nfn', // Official Rep - Cake
    'ban_1fomoz167m7o38gw4rzt7hz67oq6itejpt4yocrfywujbpatd711cjew8gjj', // Official Rep - FOMO
  ],
  defaultRepresentatives = [
    {
      id: 'ban_1fomoz167m7o38gw4rzt7hz67oq6itejpt4yocrfywujbpatd711cjew8gjj',
      name: 'Official Fomo Rep',
      warn: true,
    },
    {
      id: 'ban_1cake36ua5aqcq1c5i3dg7k8xtosw7r9r7qbbf5j15sk75csp9okesz87nfn',
      name: 'Official FudCake Rep',	  
      warn: true,
    },
    {
      id: 'ban_1bananobh5rat99qfgt1ptpieie5swmoth87thi74qgbfrij7dcgjiij94xr',
      name: 'Official BananoRatPie Rep',
      warn: true,
    },
    {
      id: 'ban_1banbet955hwemgsqrb8afycd3nykaqaxsn7iaydcctfrwi3rbb36y17fbcb',
      name: 'BananoBet Rep',
      warn: true,
    },
    {
      id: 'ban_1ka1ium4pfue3uxtntqsrib8mumxgazsjf58gidh1xeo5te3whsq8z476goo',
      name: 'Kalium Rep',
      warn: true,
    },
{
      id: 'ban_1creepi89mp48wkyg5fktgap9j6165d8yz6g1fbe5pneinz3by9o54fuq63m',
      name: ' creeper.banano.cc',
      warn: false,
    },
{
      id: 'ban_1tipbotgges3ss8pso6xf76gsyqnb69uwcxcyhouym67z7ofefy1jz7kepoy',
      name: 'Banano-Tipbots',
      warn: false,
    },
{
      id: 'ban_1sebrep1mbkdtdb39nsouw5wkkk6o497wyrxtdp71sm878fxzo1kwbf9k79b',
      name: '1sebrep1 (DE)',
      warn: false,
    },
{
      id: 'ban_1bestrep6gq14bt4bi7w446m9knc6matfad7qcii7edeb33iipooh46dotdz',
      name: '1bestrep (CH)',
      warn: false,
    },
{
      id: 'ban_14z56meuqz6etgaik1ucsuyzcmp4aju73ziqkct3jdn3eqsgigihhkjitibz',
      name: 'protecc iazid (FR)',
      warn: false,
    },
  ];
};
