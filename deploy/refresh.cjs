console.log('start refresh tencentcloud cdn cache');
const fs = require('fs');
const tencentcloud = require('tencentcloud-sdk-nodejs');
const axios = require('axios');

const CdnClient = tencentcloud.cdn.v20180606.Client;

const client = new CdnClient({
  credential: {
    secretId: process.argv[2],
    secretKey: process.argv[3],
  },
  region: 'ap-shanghai',
});

client.PurgePathCache(
  {
    Paths: ['https://web.shuhole.cn/'],
    FlushType: 'flush',
  },
  (err, res) => {
    console.log(res);
    console.log('refresh tencentcloud cdn cache success');
    axios.post('https://charging-api.ruivon.cn/v1/deploy', {
      project: 'shuhole-web',
      version: fs.readFileSync('deploy/version.txt', 'utf-8'),
    });
  },
);
