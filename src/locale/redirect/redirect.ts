let defaultLocale = 'en';
let routing = {
  "en": '/en',
  "de": '/de'
};

const storagePath = 'nanovault-appsettings';

function getBrowserLanguage() {
  if (!navigator) return null;
  if (navigator.language != null) return navigator.language;
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages[0];
  return null;
}

function redirectToRoute(locale) {
  var href = window.location.href;
  var newlocation = href.substring(0, href.lastIndexOf('/')); 
  newlocation += locale + '/'
  console.log('Redirect to ' + newlocation);
  window.location.href = newlocation;
  return;
}

let locale = defaultLocale;
const settings = JSON.parse(localStorage.getItem(storagePath));
if (settings != null) {
  locale = settings["language"];
  console.log('stored locale: ' + locale);
  
} else {
  locale = getBrowserLanguage();
  console.log('browser locale: ' + locale);

  if (locale == null || routing[locale] == null) {
    console.log('will use default ' + defaultLocale);
    locale = defaultLocale;
  }

  locale = locale.toLowerCase();

  console.log('storing locale: ' + locale);
  localStorage.setItem(storagePath, JSON.stringify({ language: locale }));
}

redirectToRoute(routing[locale]);