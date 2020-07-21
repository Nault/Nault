const lightbox = document.createElement("div");
lightbox.id = "lightbox";
document.body.appendChild(lightbox);

const images = document.querySelectorAll(".content img");
images.forEach(image => {
  image.addEventListener("click", e => {
    lightbox.classList.add("active");
    const img = document.createElement("img");
    img.src = image.src;
    while (lightbox.firstChild) {
      lightbox.removeChild(lightbox.firstChild);
    }
    img.style.setProperty("cursor","not-allowed");
    lightbox.appendChild(img);
    lightbox.style.setProperty("cursor", "zoom-out");
  });
});

lightbox.addEventListener("click", e => {
  if (e.target !== e.currentTarget) return;
  lightbox.classList.remove("active");
});