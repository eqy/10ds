console.log('running some code...');
console.log('わかりません javascript wwwwww');

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let device_id = uuidv4().slice(0, 30);
let client_id = 'IDUG09FEkzUeYQ';


function OAuthInit(callback) {
    $.ajax({
    type: 'POST',
    url: 'https://www.reddit.com/api/v1/access_token',
    data: {
        device_id: device_id,
        grant_type: 'https://oauth.reddit.com/grants/installed_client'
    },
    beforeSend: function(xhr){
        xhr.setRequestHeader('Authorization', 'Basic ' + btoa(client_id + ':' + ''));
    }
}).done(function(data){
    let token = data['access_token'];
    callback(token);
});
}


/* smol brain */
let invalid_memes = new Set(['ROPE', 'LIFE', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUNE', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'OR', 'AT', 'MY', 'THE', 'AND']);

function findMeme(child) {
    /* cutting-edge state-of-the-art sentiment analysis */
    /* todo: EXPR dates? lol */
    /* possible strat: 
       try to match DATE SYMBOL STRIKE 
       and STRIKE SYMBOL DATE
       if first matches earlier, use first
       else use second */
    //let re = /\b[A-Za-z]{1,4} *[0-9\.]{1,9} *(?:p|c|P|C)/;
    //let re = /\b[A-Za-z]{1,4}\b *[\$0-9\.]{1,9} *(?:P(UT\b|UTS\b|\b)|C(ALL\b|ALLS\b|\b))/;
    let re = /(\b[A-Za-z]{1,4}\b) *\$?([0-9]{1,9}\.?[0-9]{0,9}) *(P(?:UT\b|UTS\b|\b)|C(?:ALL\b|ALLS\b|\b))/;
    let str = child['data']['selftext'].toUpperCase();
    let memes = [];
    let memecontexts = [];
    let found = new Set();
    let match = null;
    do {
        match = str.match(re);
        if (match != null) {
            let ticker = match[1];
            let strike = match[2];
            let type = match[3];
            match_idx = str.indexOf(match[0]);
            str = str.slice(match_idx + match[0].length);
            //match = match.toUpperCase();
            if (found.has(ticker)) {
                continue;
            }
            found.add(ticker);
            memes.push([ticker, strike, type]);
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
        let ticker = meme[0];
        if (invalid_memes.has(ticker)) {
            continue;
        }
        let bear = meme[2] == 'P';
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
    return map;
}


function generatePostLink(link_text, tooltip_text, link){
    let text = '<a href=' + link + ' class=\"postlink\" title=\"' + tooltip_text.replace(/"/g, '&quot;') + '\">' + link_text + '</a></div>';
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
    "width": 400,
    "height": 400,
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
}


function renderThreads(children) {
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
      height: 320,
      width: 1024,
      stacked: true,
      stackType: '100%'
    },
    colors: ['#fe5350', '#26a69a'],
    plotOptions: {
      bar: {
        horizontal: false,
      },
    },
    dataLabels: {enabled: false},
    stroke: {
      width: 0.8,
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
      horizontalAlign: 'center',
      offsetX: 40
    }
    };

    var chart = new ApexCharts(document.querySelector("#chart"), options);
    chart.render();
    for (idx = 0; idx < Math.min(sorted_keys.length, 8); idx++) {
        insertTickerWrapper(sorted_keys[idx], idx, stats);
        insertTicker(sorted_keys[idx], idx);
    }
    console.log('done');
}


function fetchJSON(url, successHandler, token) {
    function setHeader(xhr) {
        xhr.setRequestHeader('Authorization', 'bearer ' + token);
    }

    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json',
      success: successHandler,
      /* error: ???, guess ill die */
      beforeSend: setHeader
    });
}


/* reddit threads not software threads ¯\_(ツ)_/¯ */
function getThreads(token, reqs=5) {
    var after = ''; 
    var children = [];
    var done = 0;
    
    var base_url = 'https://oauth.reddit.com/r/wallstreetbets.json?limit=100';

    function successHandler(data) {
        /* is concat thread safe? jesus jk everything is supposedly in a
           single thread javascript lmao
        */
        children = children.concat(data['data']['children']);
        after = data['data']['after'];
        done++;
        if (done >= reqs || after == null) {
            $('div').remove('.loader');
            renderThreads(children);            
        } else {
            $('#loadingtext').text("Please be patient... " + (done*100/reqs) + '%');
            let url = base_url;
            console.log("after:", after);
            if (after != '') {
                url = url + '&after=' + after;
            }
            fetchJSON(url, successHandler, token);
        }
    }
    fetchJSON(base_url, successHandler, token);
}


OAuthInit(getThreads);
