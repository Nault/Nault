"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var hw_transport_node_hid_1 = require("@ledgerhq/hw-transport-node-hid");
var hw_app_nano_1 = require("hw-app-nano");
var rx = require("rxjs");
var electron_1 = require("electron");
var STATUS_CODES = {
    SECURITY_STATUS_NOT_SATISFIED: 0x6982,
    CONDITIONS_OF_USE_NOT_SATISFIED: 0x6985,
    INVALID_SIGNATURE: 0x6a81,
    CACHE_MISS: 0x6a82
};
var LedgerStatus = {
    NOT_CONNECTED: "not-connected",
    LOCKED: "locked",
    READY: "ready",
};
var LedgerService = (function () {
    function LedgerService() {
        this.walletPrefix = "44'/165'/";
        this.waitTimeout = 300000;
        this.normalTimeout = 5000;
        this.pollInterval = 45000;
        this.pollingLedger = false;
        this.queryingLedger = false;
        this.ledgerStatus$ = new rx.Subject();
        this.ledgerMessage$ = new rx.Subject();
        this.ledger = {
            status: LedgerStatus.NOT_CONNECTED,
            nano: null,
            transport: null,
        };
    }
    LedgerService.prototype.resetLedger = function (errorMessage) {
        if (errorMessage === void 0) { errorMessage = ''; }
        console.log("Resetting transport/nano objects....");
        this.ledger.transport = null;
        this.ledger.nano = null;
        // if (this.ledger.status !== LedgerStatus.NOT_CONNECTED) {
        //   this.setLedgerStatus(LedgerStatus.NOT_CONNECTED);
        // }
        this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, errorMessage);
    };
    LedgerService.prototype.loadTransport = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        hw_transport_node_hid_1.default.create().then(function (trans) {
                            console.log("Wtf got trans?! ", trans);
                            _this.ledger.transport = trans;
                            _this.ledger.transport.setDebugMode(true);
                            _this.ledger.transport.setExchangeTimeout(_this.waitTimeout); // 5 minutes
                            console.log("Created ledger?!", _this.ledger.transport);
                            console.log(_this.ledger.transport.device.getDeviceInfo());
                            _this.ledger.nano = new hw_app_nano_1.default(_this.ledger.transport);
                            resolve(_this.ledger.transport);
                        }).catch(reject);
                    })];
            });
        });
    };
    LedgerService.prototype.loadAppConfig = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        _this.ledger.nano.getAppConfiguration().then(resolve).catch(reject);
                    })];
            });
        });
    };
    LedgerService.prototype.loadLedger = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            var _a, _b, err_1, resolved, accountDetails, err_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        console.log("Loading ledger");
                        if (!!this.ledger.transport) return [3 /*break*/, 5];
                        console.log('Looking for ledger, checking for window property');
                        _c.label = 1;
                    case 1:
                        _c.trys.push([1, 4, , 5]);
                        // const transport = TransportNodeHid;
                        // transport.setListenDevicesDebug(true);
                        // console.log(`Transport is? `, transport);
                        // TransportNodeHid.create(5000, 20000).then(trans => {
                        //   console.log(`Wtf got trans?! `, trans);
                        //
                        //   this.ledger.transport = trans;
                        //   this.ledger.transport.setDebugMode(true);
                        //   this.ledger.transport.setExchangeTimeout(this.waitTimeout); // 5 minutes
                        //   console.log(`Created ledger?!`, this.ledger.transport);
                        //   console.log(this.ledger.transport.device.getDeviceInfo());
                        //
                        //
                        // })
                        return [4 /*yield*/, this.loadTransport()];
                    case 2:
                        // const transport = TransportNodeHid;
                        // transport.setListenDevicesDebug(true);
                        // console.log(`Transport is? `, transport);
                        // TransportNodeHid.create(5000, 20000).then(trans => {
                        //   console.log(`Wtf got trans?! `, trans);
                        //
                        //   this.ledger.transport = trans;
                        //   this.ledger.transport.setDebugMode(true);
                        //   this.ledger.transport.setExchangeTimeout(this.waitTimeout); // 5 minutes
                        //   console.log(`Created ledger?!`, this.ledger.transport);
                        //   console.log(this.ledger.transport.device.getDeviceInfo());
                        //
                        //
                        // })
                        _c.sent();
                        // this.ledger.transport = await TransportNodeHid.create(5000, 20000);
                        // this.ledger.transport.setDebugMode(true);
                        console.log("Set debug!");
                        // console.log(`Created ledger?!`, this.ledger.transport);
                        // console.log(this.ledger.transport.device.getDeviceInfo());
                        console.log("DEVICES:");
                        _b = (_a = console).log;
                        return [4 /*yield*/, hw_transport_node_hid_1.default.list()];
                    case 3:
                        _b.apply(_a, [_c.sent()]);
                        return [3 /*break*/, 5];
                    case 4:
                        err_1 = _c.sent();
                        console.log("Error loading transport? ", err_1);
                        // if (err.statusText == 'UNKNOWN_ERROR') {
                        //   this.resetLedger();
                        //   return;
                        // }
                        this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, "Unable to load Ledger transport: " + (err_1.message || err_1));
                        this.resetLedger();
                        // this.ledgerStatus$.next(this.ledger.status);
                        return [2 /*return*/];
                    case 5:
                        if (!this.ledger.nano) {
                            try {
                                console.log("Loading nano!");
                                // const nano = Nano;
                                // this.ledger.nano = new Nano(this.ledger.transport);
                                console.log("Loaded nano...", this.ledger.nano);
                            }
                            catch (err) {
                                console.log(err);
                                // if (err.statusText == 'UNKNOWN_ERROR') {
                                //   this.resetLedger();
                                //   return;
                                // }
                                this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, "Unable to load Nano transport: " + (err.message || err));
                                this.resetLedger();
                                // this.ledgerStatus$.next(this.ledger.status);
                                return [2 /*return*/];
                            }
                        }
                        resolved = false;
                        if (this.ledger.status === LedgerStatus.READY) {
                            this.ledgerStatus$.next({ status: this.ledger.status, message: 'Ledger device already ready' });
                            return [2 /*return*/, true]; // Already ready?
                        }
                        setTimeout(function () {
                            if (resolved || _this.ledger.status === LedgerStatus.READY)
                                return;
                            console.log("Timeout expired, sending not connected");
                            _this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, "Ledger device not detected");
                            // this.ledger.status = LedgerStatus.NOT_CONNECTED;
                            // this.ledgerStatus$.next(this.ledger.status);
                            _this.resetLedger();
                            // if (!hideNotifications) {
                            //   this.notifications.sendWarning(`Unable to connect to the Ledger device.  Make sure it is unlocked and the Nano application is open`);
                            // }
                            resolved = true;
                            return false;
                        }, 3000);
                        _c.label = 6;
                    case 6:
                        _c.trys.push([6, 8, , 9]);
                        console.log("Loading account details");
                        return [4 /*yield*/, this.getLedgerAccount(0)];
                    case 7:
                        accountDetails = _c.sent();
                        this.setLedgerStatus(LedgerStatus.READY, "Ledger device ready");
                        // this.ledger.status = LedgerStatus.READY;
                        // this.ledgerStatus$.next(this.ledger.status);
                        resolved = true;
                        console.log("Loaded account, sending ready status - turning on polling");
                        if (!this.pollingLedger) {
                            this.pollingLedger = true;
                            this.pollLedgerStatus();
                        }
                        return [2 /*return*/, true];
                    case 8:
                        err_2 = _c.sent();
                        console.log(err_2);
                        if (err_2.statusCode === STATUS_CODES.SECURITY_STATUS_NOT_SATISFIED) {
                            // if (!hideNotifications) {
                            //   this.notifications.sendWarning(`Ledger device locked.  Unlock and open the Nano application`);
                            // }
                        }
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/, false];
                }
            });
        });
    };
    LedgerService.prototype.getLedgerAccount = function (accountIndex, showOnScreen) {
        if (showOnScreen === void 0) { showOnScreen = false; }
        return __awaiter(this, void 0, void 0, function () {
            var account, err_3, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("Getting account at index ", accountIndex, 'show?', showOnScreen);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        this.ledger.transport.setExchangeTimeout(showOnScreen ? this.waitTimeout : this.normalTimeout);
                        console.log("Yolo gl");
                        this.queryingLedger = true;
                        return [4 /*yield*/, this.ledger.nano.getAddress(this.ledgerPath(accountIndex), showOnScreen)];
                    case 2:
                        account = _a.sent();
                        this.queryingLedger = false;
                        console.log("Got account: ", account);
                        console.log("Sending message");
                        this.ledgerMessage$.next({ event: 'account-details', data: Object.assign({ accountIndex: accountIndex }, account) });
                        return [3 /*break*/, 4];
                    case 3:
                        err_3 = _a.sent();
                        this.queryingLedger = false;
                        console.log("Error when getting account: ", err_3);
                        data = { error: true, errorMessage: typeof err_3 === 'string' ? err_3 : err_3.message };
                        this.ledgerMessage$.next({ event: 'account-details', data: Object.assign({ accountIndex: accountIndex }, data) });
                        if (err_3.statusCode === STATUS_CODES.CONDITIONS_OF_USE_NOT_SATISFIED) {
                            // This means they simply denied it...
                            return [2 /*return*/]; // We won't reset the ledger status in this instance
                        }
                        // const data = { error: true, errorMessage: typeof err === 'string' ? err : err.message };
                        // this.ledgerMessage$.next({ event: 'account-details', data: Object.assign({ accountIndex }, data) });
                        this.resetLedger(data.errorMessage); // Apparently ledger not working?
                        throw err_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    LedgerService.prototype.cacheBlock = function (accountIndex, cacheData, signature) {
        return __awaiter(this, void 0, void 0, function () {
            var cacheResponse, err_4, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("Caching block... ", accountIndex, cacheData, signature);
                        this.queryingLedger = true;
                        return [4 /*yield*/, this.ledger.nano.cacheBlock(this.ledgerPath(accountIndex), cacheData, signature)];
                    case 1:
                        cacheResponse = _a.sent();
                        this.queryingLedger = false;
                        console.log("Got cache response: ", cacheResponse);
                        console.log("Sending cache response to desktop...?");
                        this.ledgerMessage$.next({ event: 'cache-block', data: Object.assign({ accountIndex: accountIndex }, cacheResponse) });
                        return [3 /*break*/, 3];
                    case 2:
                        err_4 = _a.sent();
                        this.queryingLedger = false;
                        console.log("Error when caching block: ", err_4);
                        data = { error: true, errorMessage: typeof err_4 === 'string' ? err_4 : err_4.message };
                        this.ledgerMessage$.next({ event: 'cache-block', data: Object.assign({ accountIndex: accountIndex }, data) });
                        this.resetLedger(); // Apparently ledger not working?
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LedgerService.prototype.signBlock = function (accountIndex, blockData) {
        return __awaiter(this, void 0, void 0, function () {
            var signResponse, err_5, data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        console.log("signing block... ", accountIndex, blockData);
                        this.queryingLedger = true;
                        return [4 /*yield*/, this.ledger.nano.signBlock(this.ledgerPath(accountIndex), blockData)];
                    case 1:
                        signResponse = _a.sent();
                        this.queryingLedger = false;
                        console.log("Got sign response?! ", signResponse);
                        this.ledgerMessage$.next({ event: 'sign-block', data: Object.assign({ accountIndex: accountIndex }, signResponse) });
                        return [3 /*break*/, 3];
                    case 2:
                        err_5 = _a.sent();
                        this.queryingLedger = false;
                        console.log("Error when signing block: ", err_5);
                        data = { error: true, errorMessage: typeof err_5 === 'string' ? err_5 : err_5.message };
                        this.ledgerMessage$.next({ event: 'sign-block', data: Object.assign({ accountIndex: accountIndex }, data) });
                        this.resetLedger(); // Apparently ledger not working?
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    LedgerService.prototype.setLedgerStatus = function (status, statusText) {
        if (statusText === void 0) { statusText = ''; }
        this.ledger.status = status;
        this.ledgerStatus$.next({ status: this.ledger.status, statusText: statusText });
        // if (this.ledger.status !== status) {
        //   this.ledger.status = status;
        //   this.ledgerStatus$.next({ status: this.ledger.status, statusText });
        // }
    };
    LedgerService.prototype.ledgerPath = function (accountIndex) {
        return "" + this.walletPrefix + accountIndex + "'";
    };
    LedgerService.prototype.pollLedgerStatus = function () {
        var _this = this;
        if (!this.pollingLedger)
            return;
        setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.checkLedgerStatus()];
                    case 1:
                        _a.sent();
                        this.pollLedgerStatus();
                        return [2 /*return*/];
                }
            });
        }); }, this.pollInterval);
    };
    LedgerService.prototype.checkLedgerStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var err_6;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.ledger.status !== LedgerStatus.READY)
                            return [2 /*return*/];
                        if (this.queryingLedger)
                            return [2 /*return*/]; // Already querying ledger, skip this iteration
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.getLedgerAccount(0, false)];
                    case 2:
                        _a.sent();
                        this.setLedgerStatus(LedgerStatus.READY);
                        return [3 /*break*/, 4];
                    case 3:
                        err_6 = _a.sent();
                        this.setLedgerStatus(LedgerStatus.NOT_CONNECTED, "Ledger Disconnected: " + (err_6.message || err_6));
                        // this.ledger.status = LedgerStatus.NOT_CONNECTED;
                        this.pollingLedger = false;
                        return [3 /*break*/, 4];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return LedgerService;
}());
exports.LedgerService = LedgerService;
var sendingWindow = null;
electron_1.ipcMain.on('msg', function (event, data, data2) {
    // console.log('Got event on ipc main! ', event);
    console.log('Got message on ipc main ', data);
});
function initialize() {
    var Ledger = new LedgerService();
    // Ledger.loadLedger();
    Ledger.ledgerStatus$.subscribe(function (newStatus) {
        console.log("Got new ledger status, attempting to send?");
        if (!sendingWindow)
            return;
        console.log("Sending new status: !?", newStatus);
        sendingWindow.send('ledger', { event: 'ledger-status', data: newStatus });
    });
    Ledger.ledgerMessage$.subscribe(function (newMessage) {
        console.log("Got new ledger message, attempting to send?");
        if (!sendingWindow)
            return;
        console.log("Sending new message: !?", newMessage);
        sendingWindow.send('ledger', newMessage);
    });
    electron_1.ipcMain.on('ledger', function (event, data) {
        console.log("Got ledger message?!", data);
        sendingWindow = event.sender;
        if (!data || !data.event)
            return;
        switch (data.event) {
            case 'get-ledger-status':
                Ledger.loadLedger();
                break;
            case 'account-details':
                Ledger.getLedgerAccount(data.data.accountIndex || 0, data.data.showOnScreen || false);
                break;
            case 'cache-block':
                Ledger.cacheBlock(data.data.accountIndex, data.data.cacheData, data.data.signature);
                break;
            case 'sign-block':
                Ledger.signBlock(data.data.accountIndex, data.data.blockData);
                break;
        }
    });
}
exports.initialize = initialize;
// module.exports = {
//   initialize,
// };
//# sourceMappingURL=ledger.js.map