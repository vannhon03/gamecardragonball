const flipSound = new Audio('audio/latbai.wav');
const matchSound = new Audio('audio/latbaithuong.ogg');
const dragonBallSound = new Audio('audio/latbaingocrong.wav');
const bgMusic = new Audio('audio/nhacnen1.mp3');

// 2. Chỉnh thủ công âm lượng (0.0 đến 1.0)
flipSound.volume = 0.9;       // Để max 100% vì tiếng lật bài cần nghe rõ
matchSound.volume = 0.7;      // Tiếng khớp bài vừa phải
dragonBallSound.volume = 0.8; // Tiếng Ngọc Rồng to rõ
bgMusic.volume = 0.2;         // Nhạc nền để nhỏ (20%) để không át tiếng game

// Cấu hình lặp lại
bgMusic.loop = true;
// Thay vì lưu theo từng tên, ta lưu một mảng chung
// Dữ liệu bảng xếp hạng
let leaderboard = JSON.parse(localStorage.getItem('db_leaderboard')) || [];
let currentXp = 0; // Đặt ở đầu file // Điểm XP trong màn hiện tại
let playerName = "";
let playCount = 0;
window.onload = () => { renderLeaderboard(); };
// vật phẩm hỗ trợ
let consecutiveMatches = 0; // Đếm số cặp khớp liên tiếp
let hasClock = false;
let hasSenzu = false;
let currentCombo = 0;

// Đảm bảo bạn đã khai báo: let currentCombo = 0; ở trên cùng file JS
function onMatchFound(isDragonBall) {
    // 1. Logic tính điểm XP
    currentXp += isDragonBall ? 15 : 10;
    document.getElementById('display-xp').innerText = currentXp;

    const xpDisplay = document.getElementById('xp-display');
    if (xpDisplay) {
        xpDisplay.innerText = "XP: " + currentXp;
    }

    // 2. Logic Combo vật phẩm
    currentCombo++; // Tăng đếm mỗi khi lật đúng 1 cặp

    // Mốc 2 HIT: Mở khóa Đồng hồ
    if (currentCombo === 2) {
        hasClock = true;
        document.getElementById('item-clock').style.opacity = '1';
        document.getElementById('item-clock').style.transform = 'scale(1.1)';
    }

    // Mốc 3 HIT: Mở khóa Đậu thần
    if (currentCombo === 3) {
        hasSenzu = true;
        document.getElementById('item-senzu').style.opacity = '1';
        document.getElementById('item-senzu').style.transform = 'scale(1.1)';

        // Reset combo để bắt đầu chuỗi mới
        currentCombo = 0;
    }
}
function startGame() {
    const nameInput = document.getElementById('player-name').value.trim();
    if (!nameInput) return alert("Vui lòng nhập tên!");

    let userData = JSON.parse(localStorage.getItem(nameInput)) || { count: 0 };

    // Nếu đã chơi đủ 3 lần thì chặn
    if (userData.count >= 3) {
        alert("Bạn đã chơi quá 3 lần với tên này! Hãy dùng tên mới.");
        return;
    }

    // Tăng lượt khi bắt đầu ván mới
    userData.count++;
    localStorage.setItem(nameInput, JSON.stringify(userData));

    playerName = nameInput;
    playCount = userData.count; // Cập nhật biến toàn cục

    resetDragonBalls(); // <--- THÊM DÒNG NÀY VÀO ĐÂY

    // Hiện bảng điểm bên phải
    document.getElementById('live-score-panel').style.display = 'block';
    document.getElementById('display-name').innerText = playerName;

    document.getElementById('login-overlay').classList.remove('show');
    bgMusic.play(); // Bắt đầu phát nhạc nền
    startStage(1);
}
// Dữ liệu bộ bài từng màn
const stage1Dataset = [
    { id: 'ball1', name: 'img/1sao.jpeg' },
    { id: 'ball2', name: 'img/2sao.jpeg' },
    { id: 'ball3', name: 'img/3sao.jpeg' },
    { id: 'goku', name: 'img/goku2.png' },
    { id: 'vegeta', name: 'img/vegeta.jpg' },
    { id: 'bulma', name: 'img/gohan.jpg' }
];

const stage2Dataset = [
    { id: 'ball4', name: 'img/4sao.jpeg' },
    { id: 'ball5', name: 'img/5sao.jpeg' },
    { id: 'ball6', name: 'img/6sao.jpeg' },
    { id: 'ball7', name: 'img/7sao.jpeg' },
    { id: 'cell', name: 'img/picollo.jpg' },
    { id: 'buu', name: 'img/majinbuu.png' },
    { id: 'frieza_p2', name: 'img/fize.jpg' },
    { id: 'broly', name: 'img/broly.jpg' }
];

// Các biến trạng thái cốt lõi
let currentStage = 1;
let cardsArray = [];
let flippedCards = [];
let isLockBoard = false;

// Hệ thống tính điểm, Thời gian & Máu Boss
let timeLeft = 60;
let timerInterval;
let currentHp = 100;
let comboCount = 0;
// Bổ sung thêm biến này vào cụm khai báo biến ở đầu file script.js
let totalPairsInStage = 0;
let matchedPairsInStage = 0; // Thêm dòng này để đếm số cặp thực tế đã lật được trong màn

// Khai báo phần tử DOM
const gridContainer = document.getElementById('game-grid');
const timerDisplay = document.getElementById('time-left');
const hpBar = document.getElementById('hp-bar');
const hpText = document.getElementById('hp-text');
const bossNameDisplay = document.getElementById('boss-name');
const comboDisplay = document.getElementById('combo-display');
const overlay = document.getElementById('overlay');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalBtn = document.getElementById('modal-btn');
const shenronContainer = document.getElementById('shenron-container');

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        let temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

// Hàm khởi tạo hoặc reset màn chơi
// Thêm dòng reset này vào ngay đầu hàm startStage(stageNum)
function startStage(stageNum) {
    // 1. Dừng bộ đếm cũ ngay lập tức (RẤT QUAN TRỌNG)
    if (typeof timerInterval !== 'undefined') {
        clearInterval(timerInterval);
    }

    currentStage = stageNum;
    flippedCards = [];
    isLockBoard = false;
    comboCount = 0;
    currentHp = 100;
    matchedPairsInStage = 0;
    comboDisplay.innerText = "";
    updateHpDisplay();

    // CHỈ RESET XP KHI LÀ MÀN 1
    if (currentStage === 1) {
        currentXp = 0;
        document.getElementById('display-xp').innerText = currentXp; // Cập nhật bảng phải
    }

    // Thiết lập cấu hình màn chơi
    if (currentStage === 1) {
        bossNameDisplay.innerText = "BOSS: FRIEZA (MÀN 1)";
        cardsArray = [...stage1Dataset, ...stage1Dataset];
        totalPairsInStage = stage1Dataset.length;
        timeLeft = 50;
    } else {
        bossNameDisplay.innerText = "BOSS: MAJIN BUU (MÀN 2)";
        cardsArray = [...stage2Dataset, ...stage2Dataset];
        totalPairsInStage = stage2Dataset.length;
        timeLeft = 60;
    }

    startTimer();
    shuffle(cardsArray);
    gridContainer.innerHTML = '';

    // ... phần tạo thẻ bài giữ nguyên ...
    cardsArray.forEach((item) => {
        const cardElement = document.createElement('div');
        cardElement.classList.add('card');
        cardElement.dataset.id = item.id;
        cardElement.dataset.name = item.name;
        cardElement.innerText = '?';
        cardElement.addEventListener('click', flipCard);
        gridContainer.appendChild(cardElement);
    });
}

function flipCard() {
    // 1. Chặn click nếu đang check cặp hoặc thẻ đã lật/khớp
    if (isLockBoard) return;
    if (this.classList.contains('flipped') || this.classList.contains('matched')) return;

    // 2. Phát âm thanh lật bài
    // Sử dụng currentTime = 0 để đảm bảo phát âm thanh ngay lập tức kể cả khi click liên tiếp
    flipSound.currentTime = 0;
    flipSound.play();

    // 3. Xử lý hiển thị
    this.classList.add('flipped');
    this.innerHTML = `<img src="${this.dataset.name}" alt="card-img" style="width: 100%; height: 100%; object-fit: contain;">`;

    // 4. Lưu thẻ vào mảng để kiểm tra
    flippedCards.push(this);

    // 5. Kiểm tra nếu đã lật đủ 2 thẻ
    if (flippedCards.length === 2) {
        checkMatch();
    }
}

// Thay thế hàm checkMatch trong script.js của bạn
function checkMatch() {
    isLockBoard = true;
    const [card1, card2] = flippedCards;

    if (card1.dataset.id === card2.dataset.id) {
        // --- XỬ LÝ KHI ĐÚNG CẶP ---
        const isDragonBall = card1.dataset.id.startsWith('ball');

        if (isDragonBall) {
            dragonBallSound.currentTime = 0;
            dragonBallSound.play();
        } else {
            matchSound.currentTime = 0;
            matchSound.play();
        }

        setTimeout(() => {
            card1.classList.add('matched');
            card2.classList.add('matched');

            // GỌI HÀM CỘNG ĐIỂM & TÍCH LŨY VẬT PHẨM (Đã bao gồm currentCombo++)
            onMatchFound(isDragonBall);

            if (isDragonBall) {
                const ballNum = card1.dataset.id.replace('ball', '');
                document.getElementById(`ball-${ballNum}`).classList.add('active');
            }

            comboCount++;
            damageBoss();

            matchedPairsInStage++;

            flippedCards = [];
            isLockBoard = false;

            if (matchedPairsInStage === totalPairsInStage) {
                handleStageClear();
            }
        }, 500);

    } else {
        // --- XỬ LÝ KHI SAI CẶP ---
        setTimeout(() => {
            // Reset combo boss (của bạn)
            comboCount = 0;
            comboDisplay.innerText = "";

            // --- ĐỒNG BỘ: RESET COMBO VẬT PHẨM ---
            currentCombo = 0;
            // Làm mờ lại các vật phẩm nếu chưa sử dụng
            if (!hasClock) document.getElementById('item-clock').style.opacity = '0.3';
            if (!hasSenzu) document.getElementById('item-senzu').style.opacity = '0.3';

            card1.classList.remove('flipped');
            card2.classList.remove('flipped');

            card1.innerHTML = '?';
            card2.innerHTML = '?';

            flippedCards = [];
            isLockBoard = false;
        }, 1000);
    }
}

// Thay thế hàm damageBoss trong script.js của bạn
function damageBoss() {
    const baseDamage = 100 / totalPairsInStage;
    let comboMultiplier = 1 + (comboCount - 1) * 0.5;
    let actualDamage = baseDamage * comboMultiplier;

    currentHp -= actualDamage;
    if (currentHp < 0) currentHp = 0;

    updateHpDisplay();

    if (comboCount === 1) {
        comboDisplay.innerText = "1 HIT!";
    } else {
        comboDisplay.innerText = `${comboCount} HITS! (COMBO X${comboMultiplier})`;
    }
}

function updateHpDisplay() {
    hpBar.style.width = `${currentHp}%`;
    hpText.innerText = `${Math.round(currentHp)}%`;
}

function handleStageClear() {
    // Nếu đang ở Màn 1
    if (currentStage === 1) {
        const notification = document.getElementById('stage-notification');
        notification.innerText = "Ác nhân đã kêu gọi đồng minh! Hãy chuẩn bị tinh thần tiếp tục trận chiến hởi vị cứu tinh của trái đất!!!";
        notification.style.display = 'block';

        setTimeout(() => {
            notification.style.display = 'none';
            // Logic hồi máu
            let healInterval = setInterval(() => {
                currentHp += 5;
                if (currentHp >= 100) {
                    currentHp = 100;
                    clearInterval(healInterval);
                    startStage(2); // Chuyển sang màn 2
                }
                updateHpDisplay();
            }, 50);
        }, 5000);
    }
    // Nếu đang ở Màn 2 (Màn cuối) -> Triệu hồi Rồng Thần!
    // Thay vì gọi triggerShenron(), bạn cập nhật thành:
    else if (currentStage === 2) {
        endGame(true); // Gọi hàm đã được tối ưu hóa để hiển thị Rồng Thần
    }
}

function startTimer() {
    // Luôn chắc chắn chỉ có 1 interval chạy
    timerDisplay.innerText = timeLeft + "s";

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            endGame(false); // Thua cuộc
        }
    }, 1000);
}

function endGame(isWin) {
    clearInterval(timerInterval);

    // 1. Ẩn bảng điểm thời gian thực
    const liveScorePanel = document.getElementById('live-score-panel');
    if (liveScorePanel) {
        liveScorePanel.style.display = 'none';
    }

    overlay.classList.add('show');

    // Lấy thẻ GIF
    const victoryGif = document.getElementById('victory-gif');

    if (isWin) {
        document.body.classList.add('shake-effect');
        setTimeout(() => document.body.classList.remove('shake-effect'), 1000);

        modalTitle.innerText = "XUẤT HIỆN RỒNG THẦN SHENRON! 🐉";
        modalMessage.innerHTML = `${playerName}, bạn đã thắng với <b>${currentXp} XP</b>!`;

        // Hiển thị GIF
        victoryGif.src = "img/rongthanfinal.gif?t=" + new Date().getTime(); // Ép load lại từ đầu
        victoryGif.style.display = "block";

        shenronContainer.style.display = "block";
        modalBtn.innerText = "Chơi ván mới (Nhập tên mới)";

        // Lưu kết quả
        const totalTimeLimit = (currentStage === 1 ? 50 : 60);
        saveResult(playerName, (totalTimeLimit - timeLeft), currentXp);
    } else {
        victoryGif.style.display = "none"; // Ẩn GIF nếu thua
        modalTitle.innerText = "GAME OVER! 💀";
        modalMessage.innerHTML = `${playerName}, bạn đã thất bại. (Lượt chơi: ${playCount}/3)`;
        shenronContainer.style.display = "none";
        modalBtn.innerText = (playCount < 3) ? "Thử lại" : "Chơi ván mới (Hết lượt)";
    }

    // 2. Định nghĩa lại sự kiện click cho nút modal
    modalBtn.onclick = () => {
        // NẾU THẮNG hoặc ĐÃ HẾT 3 LƯỢT: Quay về màn hình nhập tên
        if (isWin || playCount >= 3) {
            // Thay vì location.reload(), ta reset về màn hình Login
            overlay.classList.remove('show');
            document.getElementById('login-overlay').classList.add('show');

            // Xóa dữ liệu tạm để sẵn sàng cho người mới
            playerName = "";
            currentXp = 0;
            // Xóa sạch grid hiện tại
            gridContainer.innerHTML = '';
            return;
        }

        // NẾU THUA VÀ CÒN LƯỢT: Reset game tiếp tục
        if (playCount < 3) {
            resetGame();
        }
    };
}
// Hàm resetGame đặt trong script.js (không nằm trong endGame)
function resetGame() {
    let userData = JSON.parse(localStorage.getItem(playerName));

    // Tăng lượt chơi
    userData.count++;
    localStorage.setItem(playerName, JSON.stringify(userData));

    // Cập nhật biến toàn cục để endgame biết đã chơi bao nhiêu lần
    playCount = userData.count;

    overlay.classList.remove('show');
    shenronContainer.style.display = "none";

    resetDragonBalls(); // <--- THÊM DÒNG NÀY VÀO ĐÂY

    // Reset các thông số game
    currentHp = 100;
    comboCount = 0;
    matchedPairsInStage = 0;

    // Hiện lại bảng điểm phải
    document.getElementById('live-score-panel').style.display = 'block';

    startStage(1);
}
function renderLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;

    list.innerHTML = leaderboard.slice(0, 5).map((p, i) => `
        <div class="leader-item">
            <span>${i + 1}. ${p.name}</span>
            <span>${p.xp} XP - ${p.time}s</span>
        </div>
    `).join('');
}
function saveResult(name, finalTime, finalXp) {
    // 1. Lấy dữ liệu mới nhất từ localStorage (phòng trường hợp tab khác hoặc ván khác đã cập nhật)
    let currentLeaderboard = JSON.parse(localStorage.getItem('db_leaderboard')) || [];

    // 2. Thêm kết quả vào mảng vừa lấy được
    currentLeaderboard.push({ name: name, time: finalTime, xp: finalXp });

    // 3. Sắp xếp: ưu tiên XP cao, nếu bằng thì thời gian thấp hơn
    currentLeaderboard.sort((a, b) => b.xp - a.xp || a.time - b.time);

    // 4. Lưu lại mảng đã cập nhật vào localStorage
    localStorage.setItem('db_leaderboard', JSON.stringify(currentLeaderboard));

    // 5. Cập nhật biến toàn cục và render lại bảng xếp hạng
    leaderboard = currentLeaderboard;
    renderLeaderboard();
}

function clearAllData() {
    if (confirm("Bạn có chắc chắn muốn xóa toàn bộ dữ liệu người chơi và bảng xếp hạng?")) {
        // 1. Xóa bảng xếp hạng
        localStorage.removeItem('db_leaderboard');

        // 2. Xóa dữ liệu lượt chơi của TẤT CẢ người chơi
        // Chúng ta duyệt qua tất cả key và xóa những key nào không phải là 'db_leaderboard'
        // hoặc bạn có thể chỉ định rõ nếu biết các key tên người chơi.
        // Cách an toàn nhất là xóa mọi thứ liên quan đến game (nếu bạn dùng prefix)
        // Hoặc xóa sạch toàn bộ localStorage (nếu game này là ứng dụng duy nhất)

        // Nếu bạn muốn xóa TẤT CẢ mọi thứ trong localStorage:
        localStorage.clear();

        // Reset lại các biến toàn cục
        leaderboard = [];
        renderLeaderboard();

        alert("Đã xóa sạch dữ liệu! Bạn có thể nhập lại tên từ đầu.");
        location.reload(); // Tải lại trang để reset trạng thái
    }
}
// 1. Hiện/Ẩn bảng cài đặt
document.getElementById('settings-icon').onclick = () => {
    const panel = document.getElementById('settings-panel');
    panel.style.display = (panel.style.display === 'block') ? 'none' : 'block';
};

// 2. Gán sự kiện thay đổi âm lượng
document.getElementById('vol-bg').oninput = (e) => bgMusic.volume = e.target.value;
document.getElementById('vol-flip').oninput = (e) => flipSound.volume = e.target.value;
document.getElementById('vol-match').oninput = (e) => matchSound.volume = e.target.value;
document.getElementById('vol-ball').oninput = (e) => dragonBallSound.volume = e.target.value;

// 3. (Tuỳ chọn) Lưu cài đặt vào localStorage để lần sau mở game vẫn giữ mức âm lượng cũ
document.querySelectorAll('#settings-panel input').forEach(input => {
    input.addEventListener('change', () => {
        localStorage.setItem(input.id, input.value);
    });
});

// Load cài đặt cũ (thêm vào sau khi khai báo các đối tượng Audio)
window.onload = () => {
    // 1. Render bảng xếp hạng
    renderLeaderboard();
    // 2. Load cài đặt âm thanh
    document.querySelectorAll('#settings-panel input').forEach(input => {
        const savedVal = localStorage.getItem(input.id);
        if (savedVal) {
            input.value = savedVal;
            // Áp dụng ngay vào object Audio
            if (input.id === 'vol-bg') bgMusic.volume = savedVal;
            if (input.id === 'vol-flip') flipSound.volume = savedVal;
            if (input.id === 'vol-match') matchSound.volume = savedVal;
            if (input.id === 'vol-ball') dragonBallSound.volume = savedVal;
        }
    });
};
function resetDragonBalls() {
    // Tìm tất cả các thẻ có class 'ball-slot' và xóa class 'active'
    const balls = document.querySelectorAll('.ball-slot');
    balls.forEach(ball => {
        ball.classList.remove('active');
    });
}
function useItem(type) {
    if (type === 'clock' && hasClock) {
        // Cộng 10 giây
        timeLeft += 10;
        document.getElementById('time-left').innerText = timeLeft;

        // Reset trạng thái Đồng hồ
        hasClock = false;
        document.getElementById('item-clock').style.opacity = '0.3';
        document.getElementById('item-clock').style.transform = 'scale(1)';
    }
    else if (type === 'senzu' && hasSenzu) {
        // 1. Cộng 5 XP vào biến điểm số chung (sử dụng currentXp để đồng bộ với onMatchFound)
        currentXp += 5;

        // 2. Cập nhật vào "Bảng điểm hiện tại" (Cập nhật cả 2 ID nếu bạn có dùng cả 2)
        const displayXp = document.getElementById('display-xp');
        if (displayXp) displayXp.innerText = currentXp;

        const xpDisplay = document.getElementById('xp-display');
        if (xpDisplay) xpDisplay.innerText = "XP: " + currentXp;

        // 3. Reset trạng thái Đậu thần
        hasSenzu = false;
        document.getElementById('item-senzu').style.opacity = '0.3';
        document.getElementById('item-senzu').style.transform = 'scale(1)';
    }
}
// Bắt đầu chạy trận đấu từ Màn 1
