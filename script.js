const modal = document.getElementById("enrollModal");
const btn = document.getElementById("enrollBtn");
const closeBtn = document.querySelector(".close");

if(btn) {
    btn.onclick = () => modal.style.display = "block";
}

closeBtn.onclick = () => modal.style.display = "none";

window.onclick = (e) => {
    if (e.target == modal) modal.style.display = "none";
}