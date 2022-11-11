async function groupTabs(){

  const tabs = await getTabs();
  const similarUrl = tabs
  .map(e=>
     e.url
      ?e.url.match(/(?<=:\/\/)(.*?)\//gm)[0].replace('\/','')
      :null
  )
  .reduce((acc,e)=>{
    if(acc){
      const i = acc.map(e=>e.url).indexOf(e)
      if(i != -1){
        acc[i].n++
      }else{
        acc.push({
          url: e,
          n: 1
        })
      }
    }else{
      acc = [];
    }
    return acc;
  },[])
  const groups = await getCurrentGroups(similarUrl.map(e=>e.url))
  createGroups(groups, similarUrl, tabs);
}

/**
 * @param {string[]} urls 
 * @returns 
 */
async function getCurrentGroups(urls){
  const tabsGroups = [];
  for(const url of urls){
    const [group] = await chrome.tabGroups.query({
      title: url
    })
    if(group){
      tabsGroups.push(group) 
    }
  }
  return tabsGroups;
}

async function createGroups(groups, similarUrl, tabs){
  const urls = similarUrl.map(e=>e.url);
  const titles = groups.map(e=>e.title);
  for(const url of urls){
    if(titles.includes(url)){
      addToGroup(groups.filter(e=>e.title == url)[0],
         tabs.filter(e=>e.url.includes(url)))
    }else{
      const [filteredUrl] = similarUrl.filter(e=>e.url == url)
      if(filteredUrl.n >2){
        const tabIds = tabs
        .filter(e=>e.url.includes(url))
        .map(({id})=>id);
        const group=await chrome.tabs.group({tabIds})
        await chrome.tabGroups.update(group,{title: url})
      }else{
        console.log(`la url ${url} no tiene suficientes miembros`);
      }
    }
  }
}

async function addToGroup(group, tabs){
  const tabIds = tabs.map(({id})=>id);
  await chrome.tabs.group({groupId: group.id, tabIds})
}


async function getTabs(){
  const activeTabs = await chrome.tabs.query({
    groupId: -1,
    pinned: false,
  });

  //console.log(activeTabs);
  return activeTabs;
}

(async () => {
  await groupTabs()
})();

chrome.tabs.onCreated.addListener(()=>setTimeout(()=>groupTabs(),1000));
chrome.tabs.onRemoved.addListener(groupTabs)
//chrome.tabs.onUpdated.addListener(groupTabs)