console.log('running some code...');
console.log('わかりません javascript wwwwww');

let red = '#fe5350';
let green = '#26a69a';

function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

let device_id = uuidv4().slice(0, 30);
let client_id = 'IDUG09FEkzUeYQ';
let subreddit = 'r/wallstreetbets';


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
let invalid_memes = new Set(['ROPE', 'LIFE', 'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUNE', 'JUL', 'JULY', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'OR', 'AT', 'MY', 'THE', 'AND', 'OF', 'OWN', 'BUY', 'HOLD', 'MORE', 'YOUR', 'OTM', 'SELL', 'SOLD']);

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
    //let re = /(\b[A-Za-z]{1,4}\b) *\$?([0-9]{1,9}\.?[0-9]{0,9}) *(P(?:UT\b|UTS\b|\b)|C(?:ALL\b|ALLS\b|\b))/;
    //let re = /(\b[A-Za-z]{1,4}\b)([ \/0-9])*\$?([0-9]{1,9}\.?[0-9]{0,9}) *(P(?:UT\b|UTS|\b)|C(?:ALL\b|ALLS\b|\b))/;
    //let re = /(\b[A-Za-z]{1,4}\b) *((?:[0-9]{1,4}\/[0-9]{1,4})|(?:[0-9]{1,4}\/[0-9]{1,4}\/[0-9]{1,4}))? *\$?([0-9]{1,9}\.?[0-9]{0,9}) *(P(?:UT\b|UTS|\b)|C(?:ALL\b|ALLS\b|\b))/;
    let re = /(\b[A-Za-z]{1,4}\b) *((?:[0-9]{1,4}\/[0-9]{1,4})|(?:[0-9]{1,4}\/[0-9]{1,4}\/[0-9]{1,4}))? *\$?([0-9]{1,9}\.?[0-9]{0,9}) *(P(?:UT\b|UTS|\b)|C(?:ALL\b|ALLS\b|\b))/;
    /* HANDCRAFTED HEURISTICS */
    let str = child['data']['selftext'].toUpperCase().replace(/TESLA/g, 'TSLA');
    let memes = [];
    let memecontexts = [];
    let found = new Set();
    let match = null;
    do {
        match = str.match(re);
        if (match != null) {
            let ticker = match[1];
            let strike = match[3];
            let type = match[4];
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


function findIndicator(child) {
    let re = /bear|🐻|bull|🐂/;
    let match = null;
    let bear_count = 0;
    let bull_count = 0;
    let str = child['data']['selftext'].toLowerCase();
    do {
        match = str.match(re);
        if (match != null) {
            if (match[0] == 'bear' || match[0] == '🐻') {
                bear_count++; 
            }
            else {
                bull_count++;
            }
            match_idx = str.indexOf(match[0]);
            str = str.slice(match_idx + match[0].length);
        }
    } while (match != null);
    return [bear_count, bull_count];
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
        let bear = meme[2][0] == 'P';
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
    let bear_count = 0;
    let bull_count = 0;

    for (idx = 0; idx < children.length; idx++) {
        let found_meme_results = findMeme(children[idx]);

        let counts = findIndicator(children[idx]);
        //bear_count += counts[0];
        //bull_count += counts[1];

        /* get back both call/puts and context of meme */
        memes = memes.concat(found_meme_results[0]);
        memecontexts = memecontexts.concat(found_meme_results[1]);
        console.assert(memecontexts.length == memes.length, "memecontext length check failed");
    }
    let stats = memeStats(memes, memecontexts);
    let tickers = Object.keys(stats);
    let sorted_keys = tickers.sort(function comp(a, b){
        return stats[b]['total'] - stats[a]['total'];
    });

    let put_data = [];
    let call_data = [];
    let sorted_keys_render = [];
    for (idx = 0; idx < sorted_keys.length; idx++) {
        let ticker = sorted_keys[idx];
        put_data.push(stats[ticker]['puts']);
        call_data.push(stats[ticker]['calls']);
        bear_count += stats[ticker]['puts'];
        bull_count += stats[ticker]['calls'];
        let emoji = '🐻';
        if (stats[ticker]['puts'] < stats[ticker]['calls']) {
            emoji = '🐂';
        }
        val = stats[ticker]['total'].toString();
        sorted_keys_render.push(ticker + ' ' + emoji + '(' + val + ')');
    }

    computeGuhIndex(bear_count, bull_count);

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
      width: 1920,
      stacked: true,
      columnWidth: '100%',
      stackType: '100%'
    },
    colors: [red, green],
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
      text: `${subreddit} positions`
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


function fetchJSON(url, successHandler, errorHandler, token) {
    function setHeader(xhr) {
        xhr.setRequestHeader('Authorization', 'bearer ' + token);
    }

    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json',
      success: successHandler,
      error: errorHandler,
      beforeSend: setHeader
    });
}


/* reddit threads not software threads ¯\_(ツ)_/¯ */
function getThreads(token, reqs=6) {
    var after = ''; 
    var children = [];
    var done = 0;
    
    var base_url = `https://oauth.reddit.com/${subreddit}.json?limit=100`;

    function successHandler(data) {
        /* is concat thread safe? jesus jk everything is supposedly in a
           single thread javascript lmao
        */
        children = children.concat(data['data']['children']);
        after = data['data']['after'];
        done++;
        $('#loadingtext').text("Please be patient... " + children.length.toString() + " threads fetched. (" + Math.round(done*100/reqs).toString() + '%)');
        if (done >= reqs || after == null) {
            $('div').remove('.loader');
            renderThreads(children);            
        } else {
            let url = base_url;
            console.log("after:", after);
            if (after != '') {
                url = url + '&after=' + after;
            }
            fetchJSON(url, successHandler, errorHandler, token);
        }
    }

    function errorHandler(xhr, textStatus, errorThrown) {
        $('#loadingtext').text("oof, you may have saturated our free reddit API access, please try again later...");
    }

    fetchJSON(base_url, successHandler, errorHandler, token);
}


function computeGuhIndex(put_count, call_count) {
    function errorHandler(xhr, textStatus, errorThrown) {
        let final_text = 'oof, you may have saturated our free guh index API endpoint, please try again later...';
        $('#guhindex').append(final_text);
    }

    function computeIndex(c, pc) {
        let market_change = (c/pc) - 1.0
        let sign = Math.sign(put_count - call_count)
        if (put_count > call_count) {
            index = sign*(put_count/(call_count + 1E-6))*market_change*100
        } else {
            index = sign*(call_count/(put_count + 1E-6))*market_change*100
        }
        let text = '';
        if (index < 0) {
            text += '(inverse G';
        } else {
            text += '(G';
        }
        for (i=0; i < Math.ceil(Math.abs(index/2.0)); i++) {
            text += 'U'; 
        }
        text += 'H)';
        if (index < 0) {
            $('#guhindexvalue').css('color', green);
        } else if (index > 0) {
            $('#guhindexvalue').css('color', red);
        }
        $('#guhlabel').text("guh index: ");
        $('#guhindexvalue').append(index.toString());
        $('#guhhint').append(text);
    }

    function candleHandler(data) {
        let len = data['c'].length;
        let c = data['c'][len - 1];
        let pc = data['c'][len - 2];
        computeIndex(c, pc);
    }

    function successHandler(data) {
        /* cannot get daily data, fallback to candle data */
        let c = data['c'];
        let pc = data['pc'];
        if (c == 0 && pc == 0) {
            let candle_url = 'https://finnhub.io/api/v1/stock/candle?symbol=SPY&resolution=D&count=7&token=bpuio3frh5rcil2v65d0';
            $.ajax({
              url: candle_url,
              type: 'GET',
              dataType: 'json',
              success: candleHandler,
              error: errorHandler,
            });
        } else {
            computeIndex(c, pc);
        }
    }


    let url = 'https://finnhub.io/api/v1/quote?symbol=SPY&token=bpuio3frh5rcil2v65d0';
    $.ajax({
      url: url,
      type: 'GET',
      dataType: 'json',
      success: successHandler,
      error: errorHandler,
    });
}


OAuthInit(getThreads);
