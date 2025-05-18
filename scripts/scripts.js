document.addEventListener("DOMContentLoaded", () => {
  const slidesEl = document.querySelector(".slides");
  const total = 3;
  let index = 0;

  document.querySelector(".prev").addEventListener("click", () => {
    index = (index - 1 + total) % total;
    slidesEl.style.transform = `translateX(-${index * 100}vw)`;
  });
  
  document.querySelector(".next").addEventListener("click", () => {
    index = (index + 1) % total;
    slidesEl.style.transform = `translateX(-${index * 100}vw)`;
  });
});
