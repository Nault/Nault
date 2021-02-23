// The file contents for the current environment will overwrite these during build.
// The build system defaults to the dev environment which uses `environment.ts`, but if you do
// `ng build --env=prod` then `environment.prod.ts` will be used instead.
// The list of which env maps to which file can be found in `.angular-cli.json`.

export const environment = {
  production: false,
  desktop: false,
  currency: {
    id: 'benano',
    name: 'Nano Beta',
    ticker: 'BENANO',
    precision: 30,
    maxSupply: 133248289,
    prefix: 'nano',
    supportsMyNanoNinja: false
  },
  backends: [
    {
      name: 'My Nano Ninja',
      value: 'ninja',
      api: 'https://rpc-beta.mynano.ninja/rpc',
      ws: null,
      auth: null,
      shouldRandom: true,
    },
  ],
  representativeAccounts: [
    'nano_1wojtek81gff8ppr6uwpqm3kf5z9sy6swbgy73aj5js5fwq18z3ubx778nec', // wojtek
    'nano_3frak9fj7giaw8xn4bedyt7y1rh8na3dk6jz6gc8wkmrpo9xqe7jfg73ha1f', // frakilk
    'nano_3ninja4qi61cwarib1thbr3w94n6qk3s7tquwgwoeue4bwt9nnmwf43eug1z', // My Nano Ninja
    'nano_1kitteh45srbwthaxq11tj54awh1trwuyt6o56ya4ghqinqo3a3jisbjg4dd', // Kittehcoinoisseurus
  ],
  defaultRepresentatives: [
    {
      id: 'nano_3ninja4qi61cwarib1thbr3w94n6qk3s7tquwgwoeue4bwt9nnmwf43eug1z',
      name: 'My Nano Ninja',
      trusted: true
    }
  ],
  donationAddress: 'nano_3niceeeyiaa86k58zhaeygxfkuzgffjtwju9ep33z9c8qekmr3iuc95jbqc8',
};