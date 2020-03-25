console.log('running some code...');


/* smol brain */
let invalid_memes = new Set(['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']);

function findMeme(child) {
    /* cutting-edge state-of-the-art sentiment analysis */
    /* todo: EXPR dates? lol */
    /* possible strat: 
       try to match DATE SYMBOL STRIKE 
       and STRIKE SYMBOL DATE
       if first matches earlier, use first
       else use second */
    let re = /[A-Z]{2,4} +[0-9]{1,9}(?:p|c|P|C)/;
    let str = child['data']['selftext'];
    let memes = [];
    do {
        match = str.match(re);
        if (match != null) {
            match = match[0];
            memes.push(match);
            match_idx = str.indexOf(match);
            str = str.slice(match_idx + match.length);
        }
    } while (match != null);
    return memes;
}


function memeStats(memes) {
    let space_re = /[ ]+/;
    let map = {};
    for (idx = 0; idx < memes.length; idx++) {
        let meme = memes[idx]; 
        let splits = meme.split(space_re);
        let ticker = splits[0];
        if (invalid_memes.has(ticker)) {
            continue;
        }
        let last = meme[meme.length - 1];
        let bear = last == 'p' || last == 'P';
        if (!(ticker in map)) {
            map[ticker] = {'puts': 0, 'calls': 0, 'total': 0};
        }
        map[ticker]['total']++;
        if (bear) {
            map[ticker]['puts']++; 
        } else {
            map[ticker]['calls']++;
        } 
    }
    console.log(map);
    return map;
}


function renderThreads(children) {
    console.log(children.length);
    let memes = [];
    for (idx = 0; idx < children.length; idx++) {
        let found_memes = findMeme(children[idx]);
        memes = memes.concat(found_memes);
    }
    let stats = memeStats(memes);
    let tickers = Object.keys(stats);
    let sorted_keys = tickers.sort(function comp(a, b){
        return stats[a]['total'] < stats[b]['total'];
    });
    console.log(sorted_keys);
    let put_data = [];
    let call_data = [];
    let sorted_keys_render = [];
    for (idx = 0; idx < sorted_keys.length; idx++) {
        let ticker = sorted_keys[idx];
        put_data.push(stats[ticker]['puts']);
        call_data.push(stats[ticker]['calls']);
        let emoji = '🐻';
        if (stats[ticker]['puts'] < stats[ticker]['calls']) {
            emoji = '🐂';
        }
        val = stats[ticker]['total'].toString();
        sorted_keys_render.push(ticker + ' ' + emoji + '(' + val + ')');
    }

    var options = {
      series: [{
      name: 'Puts',
      data: put_data
    }, {
      name: 'Calls',
      data: call_data
    }],
      chart: {
      type: 'bar',
      height: 420,
      width: 420,
      stacked: true,
      stackType: '100%'
    },
    colors: ['#ff4560', '#00ff8f'],
    plotOptions: {
      bar: {
        horizontal: true,
      },
    },
    stroke: {
      width: 1,
      colors: ['#fff']
    },
    title: {
      text: 'WSB Puts/Calls'
    },
    xaxis: {
      categories: sorted_keys_render,
    },
    tooltip: {
      y: {
        formatter: function (val) {
          return val
        }
      }
    },
    fill: {
      opacity: 1
    
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      offsetX: 40
    }
    };

    var chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();

    console.log('done');
}


/* reddit threads not software threads ¯\_(ツ)_/¯ */
function getThreads(reqs=10) {
    var after = ''; 
    var children = [];
    var done = 0;
    
    var base_url = 'https://www.reddit.com/r/wallstreetbets.json';

    function successHandler(data) {
        /* is concat thread safe? jesus jk everything is supposedly in a
           single thread javascript lmao
        */
        children = children.concat(data['data']['children']);
        after = data['data']['after'];
        console.log(children.length);
        done++;
        if (done >= reqs) {
            renderThreads(children);            
        } else {
            let url = base_url;
            if (after != '') {
                url = url + '?after=' + after;
            }
            $.getJSON(url, successHandler); 
        }
    }
    $.getJSON(base_url, successHandler);
}



getThreads();
