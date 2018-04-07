import { Injectable } from '@angular/core';

@Injectable()
export class RepresentativeService {
  storeKey = `nanovault-representatives`;

  representatives = [];

  defaultRepresentatives = [
    {
      id: 'xrb_3rw4un6ys57hrb39sy1qx8qy5wukst1iiponztrz9qiz6qqa55kxzx4491or',
      name: 'NanoVault Rep',
      trusted: true,
    },
    {
      id: 'xrb_3pczxuorp48td8645bs3m6c3xotxd3idskrenmi65rbrga5zmkemzhwkaznh',
      name: 'NanoWallet.io Rep',
    },
    {
      id: 'xrb_3arg3asgtigae3xckabaaewkx3bzsh7nwz7jkmjos79ihyaxwphhm6qgjps4',
      name: 'Official Rep 1',
      warn: true,
    },
    {
      id: 'xrb_1stofnrxuz3cai7ze75o174bpm7scwj9jn3nxsn8ntzg784jf1gzn1jjdkou',
      name: 'Official Rep 2',
      warn: true,
    },
    {
      id: 'xrb_1q3hqecaw15cjt7thbtxu3pbzr1eihtzzpzxguoc37bj1wc5ffoh7w74gi6p',
      name: 'Official Rep 3',
      warn: true,
    },
    {
      id: 'xrb_3dmtrrws3pocycmbqwawk6xs7446qxa36fcncush4s1pejk16ksbmakis78m',
      name: 'Official Rep 4',
      warn: true,
    },
    {
      id: 'xrb_3hd4ezdgsp15iemx7h81in7xz5tpxi43b6b41zn3qmwiuypankocw3awes5k',
      name: 'Official Rep 5',
      warn: true,
    },
    {
      id: 'xrb_1awsn43we17c1oshdru4azeqjz9wii41dy8npubm4rg11so7dx3jtqgoeahy',
      name: 'Official Rep 6',
      warn: true,
    },
    {
      id: 'xrb_1anrzcuwe64rwxzcco8dkhpyxpi8kd7zsjc1oeimpc3ppca4mrjtwnqposrs',
      name: 'Official Rep 7',
      warn: true,
    },
    {
      id: 'xrb_1hza3f7wiiqa7ig3jczyxj5yo86yegcmqk3criaz838j91sxcckpfhbhhra1',
      name: 'Official Rep 8',
      warn: true,
    },
    {
      id: 'xrb_1niabkx3gbxit5j5yyqcpas71dkffggbr6zpd3heui8rpoocm5xqbdwq44oh',
      name: 'KuCoin 1',
    },
    {
      id: 'xrb_1nanode8ngaakzbck8smq6ru9bethqwyehomf79sae1k7xd47dkidjqzffeg',
      name: 'Nanode Rep',
    },
    {
      id: 'xrb_39ymww61tksoddjh1e43mprw5r8uu1318it9z3agm7e6f96kg4ndqg9tuds4',
      name: 'BitGrail 1',
    },
    {
      id: 'xrb_1brainb3zz81wmhxndsbrjb94hx3fhr1fyydmg6iresyk76f3k7y7jiazoji',
      name: 'BrainBlocks Rep',
    },
    {
      id: 'xrb_1tig1rio7iskejqgy6ap75rima35f9mexjazdqqquthmyu48118jiewny7zo',
      name: 'OKEx Rep',
    },
    {
      id: 'xrb_3jwrszth46rk1mu7rmb4rhm54us8yg1gw3ipodftqtikf5yqdyr7471nsg1k',
      name: 'Binance Rep',
    },
    {
      id: 'xrb_16k5pimotz9zehjk795wa4qcx54mtusk8hc5mdsjgy57gnhbj3hj6zaib4ic',
      name: 'NanoWallet Bot Rep',
    },
    {
      id: 'xrb_1nanexadj9takfo4ja958st8oasuosi9tf8ur4hwkmh6dtxfugmmii5d8uho',
      name: 'Nanex Rep',
    },
  ];

  constructor() {
    this.representatives = this.defaultRepresentatives;
  }

  getRepresentative(id) {
    return this.representatives.find(rep => rep.id == id);
  }

}
