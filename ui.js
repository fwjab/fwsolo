// ==========================================
// ui.js
// Handles everything the player SEES
// ==========================================

// ---------- MAIN ----------

function openMenu(menu){

    hideAllMenus();

    switch(menu){

        case "profile":
            renderProfile();
            break;

        case "shop":
            renderShop();
            break;

        case "achievements":
            renderAchievements();
            break;

        case "titles":
            renderTitles();
            break;

        case "shadows":
            renderShadows();
            break;

        case "cosmetics":
            renderCosmetics();
            break;

        case "upgrades":
            renderUpgrades();
            break;

    }

}

// ---------- PROFILE ----------

function renderProfile(){

    const html = `

    <div class="system-window">

        <h2>Hunter Profile</h2>

        <p>Rank: ${player.rank}</p>

        <p>Level: ${player.level}</p>

        <p>XP: ${player.xp}</p>

        <p>Gold: ${player.gold}</p>

        <p>Title: ${player.title}</p>

        <p>Theme: ${player.equippedTheme}</p>

        <p>Shadow: ${player.equippedShadow || "None"}</p>

    </div>

    `;

    document.getElementById("menuContainer").innerHTML = html;

}

// ---------- SHOP ----------

function renderShop(){

    let html = "<div class='system-window'>";

    html += "<h2>Hunter Shop</h2>";

    shopItems.forEach(item=>{

        html += `

        <div class="shop-item">

            <h3>${item.name}</h3>

            <p>${item.price} Gold</p>

            <button onclick="buyItem(${item.id})">

                Buy

            </button>

        </div>

        `;

    });

    html += "</div>";

    document.getElementById("menuContainer").innerHTML = html;

}

// ---------- ACHIEVEMENTS ----------

function renderAchievements(){

    let html="<div class='system-window'>";

    html+="<h2>Achievements</h2>";

    achievements.forEach(a=>{

        html+=`

        <div>

            <h3>${a.name}</h3>

            <p>${a.goal}</p>

        </div>

        `;

    });

    html+="</div>";

    menuContainer.innerHTML=html;

}

// ---------- TITLES ----------

function renderTitles(){

    let html="<div class='system-window'>";

    html+="<h2>Titles</h2>";

    titles.forEach(title=>{

        html+=`

        <button onclick="equipTitle('${title.name}')">

        ${title.name}

        </button>

        `;

    });

    html+="</div>";

    menuContainer.innerHTML=html;

}

// ---------- SHADOWS ----------

function renderShadows(){

    let html="<div class='system-window'>";

    html+="<h2>Shadow Army</h2>";

    shadows.forEach(shadow=>{

        html+=`

        <button onclick="equipShadow('${shadow.name}')">

        ${shadow.name}

        </button>

        `;

    });

    html+="</div>";

    menuContainer.innerHTML=html;

}

// ---------- COSMETICS ----------

function renderCosmetics(){

    let html="<div class='system-window'>";

    html+="<h2>Cosmetics</h2>";

    cosmetics.forEach(theme=>{

        html+=`

        <button onclick="equipTheme('${theme.name}')">

        ${theme.name}

        </button>

        `;

    });

    html+="</div>";

    menuContainer.innerHTML=html;

}

// ---------- UPGRADES ----------

function renderUpgrades(){

    let html="<div class='system-window'>";

    html+="<h2>Permanent Upgrades</h2>";

    upgrades.forEach(upgrade=>{

        html+=`

        <div>

            <h3>${upgrade.name}</h3>

            <button onclick="buyUpgrade('${upgrade.name}')">

            Purchase

            </button>

        </div>

        `;

    });

    html+="</div>";

    menuContainer.innerHTML=html;

}

// ---------- HELPERS ----------

function hideAllMenus(){

    document.getElementById("menuContainer").innerHTML="";

}
