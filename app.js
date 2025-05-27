document.addEventListener('DOMContentLoaded', function() {
    const firebaseConfig = {
        apiKey: "AIzaSyDfmjWjPl786cVBXzqlsiZsS4MUFbwrNNM",
        authDomain: "school-festival-e4c8d.firebaseapp.com",
        databaseURL: "https://school-festival-e4c8d-default-rtdb.firebaseio.com",
        projectId: "school-festival-e4c8d",
        storageBucket: "school-festival-e4c8d.appspot.com",
        messagingSenderId: "658868728855",
        appId: "1:658868728855:web:8d7497c6838f5a42d21852"
    };
    
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const countersRef = database.ref('counters');

    countersRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            countersRef.set({
                day1: { plain: 0, choco: 0, strawberry: 0, matcha: 0, jdk: 0 },
                day2: { plain: 0, choco: 0, strawberry: 0, matcha: 0, jdk: 0 }
            });
        }
    });

    let currentDay = 'day1';
    const limits = {
        day1: { plain: 30, choco: 100, strawberry: 100, matcha: 50, jdk: 20 },
        day2: { plain: 30, choco: 150, strawberry: 150, matcha: 40, jdk: 30 }
    };

    const values = {
        plain: 100,
        choco: 100,
        strawberry: 100,
        matcha: 100,
        jdk: 200
    };

    function updateUI(counters) {
        if (!counters) return;
            for (let type in counters) {
                const count = parseInt(counters[type], 10) || 0;
                const remaining = limits[currentDay][type] - count;
                const remainingElem = document.getElementById(`${type}-remaining`);
                document.getElementById(`${type}-count`).innerText = `${count}/${limits[currentDay][type]}`;
                if (remaining === 0) {
                    remainingElem.innerText = '売り切れ';
                    remainingElem.classList.add('soldout');
                } else {
                    remainingElem.innerText = `残り: ${remaining} 個`;
                    remainingElem.classList.remove('soldout');
                }
                document.getElementById(`${type}-amount`).innerText = `${count * values[type]} 円`;
            }
            updateTotals(counters);
        }

        function logCountChange(type, delta, newCount) {
            const logRef = database.ref('logs').push();

            const timestamp = new Date();
            const formattedTimestamp = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}:${String(timestamp.getSeconds()).padStart(2, '0')}`;

            const logEntry = {
                type: type,
                change: delta > 0 ? 'increment' : 'decrement',
                amountChanged: delta,
                newCount: newCount,
                day: currentDay, // 変更された日付（1日目または2日目）
                timestamp: formattedTimestamp
            };

            logRef.set(logEntry)
            .then(() => console.log('Log entry saved successfully:', logEntry))
            .catch(error => console.error('Failed to save log entry:', error));
        }

        function changeCount(type, delta) {
            const currentCountRef = countersRef.child(`${currentDay}/${type}`);
            currentCountRef.transaction(count => {
                const newCount = (parseInt(count, 10) || 0) + delta;
                if (newCount >= 0 && newCount <= limits[currentDay][type]) {
                    logCountChange(type, delta, newCount);
                    return newCount;
                }
                return count;
            });
        }

        function updateRealTimeListener() {
            countersRef.child(currentDay).on('value', snapshot => {
            if (snapshot.exists()) {
                updateUI(snapshot.val());
            }
        });
    }

    updateRealTimeListener();

    function updateTotals(counters) {
        const totalCount = Object.values(counters).reduce((sum, count) => sum + (parseInt(count, 10) || 0), 0);
        const totalAmount = Object.entries(counters).reduce((sum, [key, count]) => sum + ((parseInt(count, 10) || 0) * values[key]), 0);

        document.getElementById('total-count').innerText = `総数量: ${totalCount} 個`;
        document.getElementById('total-amount').innerText = `総金額: ${totalAmount} 円`;
    }

    let lastSelectedDay = '1'; // 最初の状態として1日目を保持

    function confirmDayChange(selectedDay) {
        // ポップアップでユーザーに確認
        const isConfirmed = confirm("日付を変更してもよろしいですか？");

        if (!isConfirmed) {
            // ユーザーがキャンセルした場合、元の日付に戻す
            document.querySelector(`input[name="day"][value="${lastSelectedDay}"]`).checked = true;
            return;
        }

        // ユーザーが変更を許可した場合、選択された日付を保持
        lastSelectedDay = selectedDay;

        countersRef.child(currentDay).off('value');
        currentDay = selectedDay === '1' ? 'day1' : 'day2';
        document.getElementById('current-day').innerText = `現在の設定: ${currentDay === 'day1' ? '1日目' : '2日目'}`;
        countersRef.child(currentDay).once('value').then(snapshot => {
            updateUI(snapshot.val() || {});
        });
        updateRealTimeListener();
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
       
    function applyTheme(e) {
        if (e.matches) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

    mediaQuery.addEventListener('change', applyTheme);
    applyTheme(mediaQuery);

    function getDeviceType() {
        const ua = navigator.userAgent;
        if (/Mobi|Android/i.test(ua)) {
            return 'mobile';
        }
        return 'desktop';
    }

    const deviceType = getDeviceType();
    const countersElement = document.getElementById('counters');

    if (deviceType === 'mobile') {
        countersElement.classList.add('mobile');
    } else {
        countersElement.classList.add('desktop');
    }

    function updateOrientation() {
        const isPortrait = window.matchMedia("(orientation: portrait)").matches;
        if (isPortrait) {
            countersElement.classList.remove('landscape');
            countersElement.classList.add('portrait');
        } else {
            countersElement.classList.remove('portrait');
            countersElement.classList.add('landscape');
            if (deviceType === 'mobile') {
                countersElement.classList.add('landscape');
            }
        }
    }

    window.addEventListener('orientationchange', updateOrientation);
    window.addEventListener('resize', updateOrientation);

    updateOrientation();

    window.changeCount = changeCount;
    window.confirmDayChange = confirmDayChange;

    console.log('Firebase initialized with project:', firebaseConfig.projectId);
});
