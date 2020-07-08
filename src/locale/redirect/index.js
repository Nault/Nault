let defaultLocale = 'en';
let routing = {
  "en": '/en',
  "de": '/de'
};

function getBrowserLanguage() {
  if (!navigator) return null;
  if (navigator.language != null) return navigator.language;
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages[0];
  if (navigator.userLanguage) return navigator.userLanguage;
  if (navigator.browserLanguage) return navigator.browserLanguage;
  return null;
}

function getSubPath() {
  let url = window.location.href;
  let domainNameIndex = url.indexOf("//");
  let firstSlashIndex = url.indexOf("/", domainNameIndex + 2);
  if (firstSlashIndex === -1) return null;
  return url.substring(firstSlashIndex + 1);
}

function getQueryParam(name) {
  let url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
    results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function redirectToRoute(locale, subPath) {
  console.log('matching locale ' + locale + ' ...');
  let route = routing[locale];
  
  if (route != null) {
    var href = window.location.href;
    var newlocation = href.substring(0, href.lastIndexOf('/')); 
    newlocation += route
    newlocation += "/index.html";
    console.log('Redirect to ' + newlocation);
    window.location.href = newlocation;
    return;
  }

  let parts = locale.split('-');
  if (parts == null || parts.length <= 1) return;

  console.log("will try to use just the language");
  redirectToRoute(parts[0], subPath);
}

let locale = getQueryParam('locale');
let saveLocale = true;
console.log('url locale: ' + locale);

if (locale == null) {
  const settings = JSON.parse(localStorage.getItem('nanovault-appsettings'));
  if (settings != null) {
    locale = settings["language"];
  }
  console.log('stored locale: ' + locale);
  if (locale != null) saveLocale = false;
}

if (locale == null) {
  locale = getBrowserLanguage();
  console.log('browser locale: ' + locale);
}

if (saveLocale === true) {
  console.log('storing locale: ' + locale);
  localStorage.setItem('nanovault-appsettings', JSON.stringify({ language: locale }));
}

if (locale == null) {
  console.log('will use default ' + defaultLocale);
  locale = defaultLocale;
}

locale = locale.toLowerCase();
let subPath = getSubPath();
redirectToRoute(locale, subPath);