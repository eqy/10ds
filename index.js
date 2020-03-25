console.log('running some code...');
console.log('わかりません javascript wwwwww');


/* smol brain */
let invalid_memes = new Set(['ROPE', 'LIFE', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUNE', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'OR', 'AT', 'MY', 'THE']);

function findMeme(child) {
    /* cutting-edge state-of-the-art sentiment analysis */
    /* todo: EXPR dates? lol */
    /* possible strat: 
       try to match DATE SYMBOL STRIKE 
       and STRIKE SYMBOL DATE
       if first matches earlier, use first
       else use second */
    let re = /\b[A-Za-z]{2,4} +[0-9]{1,9}(?:p|c|P|C)/;
    let str = child['data']['selftext'];
    let memes = [];
    let memecontexts = [];
    let found = new Set();
    do {
        match = str.match(re);
        if (match != null) {
            match = match[0];
            match_idx = str.indexOf(match);
            str = str.slice(match_idx + match.length);
            match = match.toUpperCase();
            if (found.has(match)) {
                continue;
            }
            found.add(match);
            memes.push(match);
            /* this is hideously inefficient */
            memecontexts.push(child);
        }
    } while (match != null);
    return [memes, memecontexts];
}


function memeStats(memes, memecontexts) {
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
            map[ticker] = {'puts': 0, 'calls': 0, 'total': 0,
                           'put_texts': [], 'put_links': [], 
                           'call_texts': [], 'call_links':[]};
        }
        map[ticker]['total']++;
        let selftext = memecontexts[idx]['data']['selftext'];
        let link = memecontexts[idx]['data']['permalink'];
        if (bear) {
            map[ticker]['puts']++; 
            map[ticker]['put_texts'].push(selftext);
            map[ticker]['put_links'].push('https://www.reddit.com' + link);
        } else {
            map[ticker]['calls']++;
            map[ticker]['call_texts'].push(selftext);
            map[ticker]['call_links'].push('https://www.reddit.com' + link);
        } 
    }
    console.log(map);
    return map;
}


function generatePostLink(link_text, tooltip_text, link){
    let text = '<a href=' + link + ' title=\"' + tooltip_text + '\">' + link_text + '</a>';
    return text;
}


function insertTickerWrapper(ticker, idx, map) {
    let text = ticker + ": ";
    let put_count = map[ticker]['puts'];
    let call_count = map[ticker]['calls'];
    let bear = '🐻';
    let bull = '🐂';
    let put_texts = map[ticker]['put_texts'];
    let call_texts = map[ticker]['call_texts'];
    let put_links = map[ticker]['put_links'];
    let call_links = map[ticker]['call_links'];

    if (put_count >= call_count) {
        for (i = 0; i < put_count; i++) {
            text = text + generatePostLink(bear, put_texts[i], put_links[i]);
        }
        for (j = 0; j < call_count; j++) {
            text = text + generatePostLink(bull, call_texts[j], call_links[j]);
        }
    } else {
        for (j = 0; j < call_count; j++) {
            text = text + generatePostLink(bull, call_texts[j], call_links[j]);
        }
        for (i = 0; i < put_count; i++) {
            text = text + generatePostLink(bear, put_texts[i], put_links[j]);
        }
    } 
    $('#wrappertext' + idx.toString()).append(text);
}


function insertTicker(ticker, idx) {
    let widget = new TradingView.widget(
    {
    "width": 320,
    "height": 320,
    "symbol": ticker,
    "interval": "D",
    "timezone": "Etc/UTC",
    "theme": "light",
    "style": "1",
    "locale": "en",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "allow_symbol_change": false,
    "container_id": "tradingview" + idx.toString(),
    });
    console.log(widget);
}


function renderThreads(children) {
    console.log(children.length);
    let memes = [];
    let memecontexts = [];
    for (idx = 0; idx < children.length; idx++) {
        let found_meme_results = findMeme(children[idx]);
        /* get back both call/puts and context of meme */
        memes = memes.concat(found_meme_results[0]);
        memecontexts = memecontexts.concat(found_meme_results[1]);
        console.assert(memecontexts.length == memes.length, "memecontext length check failed");
    }
    let stats = memeStats(memes, memecontexts);
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
    colors: ['#fe5350', '#26a69a'],
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
    for (idx = 0; idx < Math.min(sorted_keys.length, 7); idx++) {
        insertTickerWrapper(sorted_keys[idx], idx, stats);
        insertTicker(sorted_keys[idx], idx);
    }
    console.log(stats);
    console.log('done');
}


/* reddit threads not software threads ¯\_(ツ)_/¯ */
function getThreads(reqs=10) {
    var after = ''; 
    var children = [];
    var done = 0;
    
    var base_url = 'https://www.reddit.com/r/wallstreetbets.json?limit=100';

    function successHandler(data) {
        /* is concat thread safe? jesus jk everything is supposedly in a
           single thread javascript lmao
        */
        children = children.concat(data['data']['children']);
        after = data['data']['after'];
        console.log(children.length);
        done++;
        if (done >= reqs || after == null) {
            $('div').remove('.loader');
            renderThreads(children);            
        } else {
            $('#loadingtext').text("P-p-please be patient... " + (done*100/reqs) + '%');
            let url = base_url;
            console.log("after:", after);
            if (after != '') {
                url = url + '&after=' + after;
            }
            $.getJSON(url, successHandler); 
        }
    }
    $.getJSON(base_url, successHandler);
}


getThreads();
