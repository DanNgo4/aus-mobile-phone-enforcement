let index = 1;
let isMoving = false;

document.addEventListener("DOMContentLoaded", () => {
  const slidesEl  = document.querySelector(".slides");
  const originals = Array.from(slidesEl.children);
  const total     = originals.length;

  const firstClone = originals[0].cloneNode(true);
  const lastClone  = originals[total - 1].cloneNode(true);

  slidesEl.appendChild(firstClone);
  slidesEl.insertBefore(lastClone, slidesEl.firstChild);

  slidesEl.style.transform = `translateX(-${index * 100}%)`;

  slidesEl.addEventListener("transitionstart", () => {
    isMoving = true;
  });

  slidesEl.addEventListener("transitionend", () => {
    isMoving = false;

    if (index === 0) {
      slidesEl.style.transition = "none";
      index = total; 
      slidesEl.style.transform = `translateX(-${index * 100}%)`;
    } else if (index === total + 1) {
      slidesEl.style.transition = "none";
      index = 1; 
      slidesEl.style.transform = `translateX(-${index * 100}%)`;
    }
  });

  function slideTo(i) {
    if (isMoving) return;

    const max = total + 1;
    const min = 0;
    const target = Math.max(min, Math.min(i, max));

    slidesEl.style.transition = "transform 0.5s ease";
    index = target;
    console.log(index);
    slidesEl.style.transform = `translateX(-${index * 100}%)`;
  }

  document.querySelector(".prev")
    .addEventListener("click", () => slideTo(index - 1));

  document.querySelector(".next")
    .addEventListener("click", () => slideTo(index + 1));
});

d3.select(".tooltip").remove();
