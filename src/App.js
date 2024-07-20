import React, { Component } from 'react';
import { Flow } from './Flows';
import { Title } from './Title';
import { Sidebar } from './Sidebar';
import { SwitchTransition, CSSTransition } from 'react-transition-group';
import { PressureHelper } from './PressureHelper';
import { TokenCtx } from './UserAction';
import { load_config, bgimg_style } from './Config';
import { listen_darkmode } from './old_infrastructure/functions';
import { TitleLine } from './old_infrastructure/widgets';
import { LoginPopup } from './login';
import { ScanCodePopup } from './ScanCodePopup';
import { cache } from './cache';
import './App.css';

import { SECURITY_ROOT } from './old_infrastructure/const';
import { API_VERSION_PARAM, get_json } from './old_infrastructure/functions';
import UAParser from 'ua-parser-js';
import PulldownRefresh from './pulldownRefresh';

const MAX_SIDEBAR_STACK_SIZE = 10;

function DeprecatedAlert(props) {
  return <div id="global-hint-container" style={{ display: 'none' }} />;
}

function needShowSuicidePrompt(text) {
  return text && text.indexOf('自杀') !== -1;
}

class App extends Component {
  constructor(props) {
    super(props);
    load_config();
    listen_darkmode(
      { default: undefined, light: false, dark: true }[
        window.config.color_scheme
      ],
    );
    this.state = {
      sidebar_stack: [[null, null]], // list of [status, content]
      mode: 'list', // list, single, search, attention
      search_text: null,
      flow_render_key: +new Date(),
      token: localStorage['TOKEN'] || null,
      override_suicide: false,
      loaded_callback: () => {},
    };
    this.show_sidebar_bound = this.show_sidebar.bind(this);
    this.set_mode_bound = this.set_mode.bind(this);
    this.on_pressure_bound = this.on_pressure.bind(this);

    /* 推广期间保持公网可见 */
    // if (!this.state.token) {
    //   fetch(SECURITY_ROOT + 'login/subnet_check?' + API_VERSION_PARAM(), {
    //     method: 'get',
    //   })
    //     .then(get_json)
    //     .then((json) => {
    //       this.inshu_flag = json.code === 0;
    //       this.set_mode('list', null);
    //     });
    // }
    this.inshu_flag = true;

    if (
      new URLSearchParams(window.location.search).get('access_token') ||
      new URLSearchParams(window.location.search).get('code') ||
      null
    ) {
      const codeMode =
        new URLSearchParams(window.location.search).get('code') !== null;
      sessionStorage.setItem('LOGINVIAWECHAT', 'true');
      const device_info = UAParser(navigator.userAgent).browser.name;
      const body = new URLSearchParams();
      if (codeMode) {
        Object.entries({
          code: new URLSearchParams(window.location.search).get('code'),
          device_type: 0,
          device_info,
        }).forEach((param) => body.append(...param));
      } else {
        Object.entries({
          access_token: new URLSearchParams(window.location.search).get(
            'access_token',
          ),
          openid: new URLSearchParams(window.location.search).get('openid'),
          device_type: 0,
          device_info,
        }).forEach((param) => body.append(...param));
      }
      fetch(
        SECURITY_ROOT +
          'login/login_' +
          (codeMode ? 'wechat?' : 'charging?') +
          API_VERSION_PARAM(),
        {
          method: 'POST',
          body,
        },
      )
        .then(get_json)
        .then((json) => {
          if (json.code !== 0) {
            localStorage.removeItem('TOKEN');
            this.setState({
              token: null,
            });
            if (!codeMode) {
              const body = new URLSearchParams();
              Object.entries({
                access_token: new URLSearchParams(window.location.search).get(
                  'access_token',
                ),
                openid: new URLSearchParams(window.location.search).get(
                  'openid',
                ),
                device_type: 0,
                device_info,
              }).forEach((param) => body.append(...param));
              fetch(
                SECURITY_ROOT +
                  'login/create_wechat_account?' +
                  API_VERSION_PARAM(),
                {
                  method: 'POST',
                  body,
                },
              )
                .then(get_json)
                .then((json) => {
                  if (json.code === 0) {
                    localStorage.setItem('TOKEN', json.token);
                    this.setState({
                      token: json.token,
                    });
                    this.set_mode('list', null);
                  }
                });
            }
          } else {
            if (this.state.token) {
              localStorage.setItem('TOKEN', json.token);
              this.setState({
                token: json.token,
              });
            } else {
              localStorage.setItem('TOKEN', json.token);
              this.setState({
                token: json.token,
              });
              this.set_mode('list', null);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    }

    if (navigator.userAgent.toLowerCase().indexOf('micromessenger') !== -1) {
      sessionStorage.setItem('LOGINVIAWECHAT', 'true');
      fetch('https://charging-api.ruivon.cn/v1/wxsign', {
        method: 'post',
        body: {
          url: window.location.href,
        },
      })
        .then(get_json)
        .then((json) => {
          console.log('wechat sign', json);
          if (json.code === 0) {
            wx.config({
              debug: false,
              ...json.data,
              jsApiList: [
                'updateAppMessageShareData',
                'updateTimelineShareData',
              ],
            });
            wx.ready(function () {
              sessionStorage.setItem('wechatReady', 'true');
              wx.miniProgram.getEnv(function (res) {
                if (res.miniprogram) {
                  console.log('in miniprogram');
                  sessionStorage.setItem('miniprogram', 'true');
                }
              });
              wx.updateTimelineShareData({
                title: '鼠洞 | 一起来和鼠鼠们分享新鲜事',
                link: 'https://web.shuhole.cn/',
                imgUrl: 'https://static.r-ay.cn/shuhole.png',
              });
              wx.updateAppMessageShareData({
                title: '一起来和鼠鼠们分享新鲜事',
                desc: '在鼠洞，畅所欲言。',
                link: 'https://web.shuhole.cn/',
                imgUrl: 'https://static.r-ay.cn/shuhole.png',
              });
            });
          }
        });
    }

    window.addEventListener('message', (e) => {
      if (e.origin === 'https://charging.shuhole.cn') {
        window.chargingSource = e.source;
        console.log('received message from charging', e.data);
      }
    });

    window.addEventListener(
      'popstate',
      (e) => {
        if (this.state.sidebar_stack.length > 1) {
          this.show_sidebar(null, null, 'pop');
        } else {
          if (window.chargingSource) {
            window.chargingSource.postMessage(
              {
                type: 'close',
              },
              'https://charging.shuhole.cn',
            );
          } else {
            window.close();
          }
        }
        e.preventDefault();
      },
      { passive: false },
    );

    window.originalAlert = window.alert;
    alert = (msg, config) => {
      console.log('hooked alert', msg);
      if (window.chargingSource)
        window.chargingSource.postMessage(
          {
            type: 'toast',
            message: {
              message: msg,
              ...config,
            },
          },
          'https://charging.shuhole.cn',
        );
      else window.originalAlert(msg);
    };

    window.toastConfirm = (msg, config) => {
      return new Promise((resolve, reject) => {
        if (window.chargingSource) {
          window.chargingSource.postMessage(
            {
              type: 'confirm',
              message: {
                message: msg,
                color: 'info',
                persist: true,
                ...config,
              },
            },
            'https://charging.shuhole.cn',
          );
          window.addEventListener('message', (e) => {
            if (e.origin === 'https://charging.shuhole.cn') {
              if (e.data.type === 'confirm') {
                if (e.data.result) resolve();
                else reject();
              }
            }
          });
        } else {
          if (window.confirm(msg)) resolve();
          else reject();
        }
      });
    };
  }

  static is_darkmode() {
    if (window.config.color_scheme === 'dark') return true;
    if (window.config.color_scheme === 'light') return false;
    else {
      // 'default'
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
  }
  componentDidMount() {
    cache(); // init indexeddb
  }

  on_pressure() {
    if (this.state.sidebar_stack.length > 1)
      this.show_sidebar(null, null, 'clear');
    else this.set_mode('list', null);
  }

  show_sidebar(title, content, mode = 'push', info = {}) {
    if (!(title && title.includes('#'))) {
      wx.updateTimelineShareData({
        title: '鼠洞 | 一起来和鼠鼠们分享新鲜事',
        link: 'https://web.shuhole.cn/',
        imgUrl: 'https://static.r-ay.cn/shuhole.png',
      });
      wx.updateAppMessageShareData({
        title: '一起来和鼠鼠们分享新鲜事',
        desc: '在鼠洞，畅所欲言。',
        link: 'https://web.shuhole.cn/',
        imgUrl: 'https://static.r-ay.cn/shuhole.png',
      });
      if (window.chargingSource)
        window.chargingSource.postMessage(
          {
            type: 'close',
          },
          'https://charging.shuhole.cn',
        );
      else
        wx.miniProgram.postMessage({
          data: {
            type: 'shuhole-index',
          },
        });
    } else {
      const thread_id = title.split('#')[1];
      wx.updateTimelineShareData({
        title: info.text
          ? `鼠洞 #${thread_id} : ${info.text}`
          : `鼠洞 #${thread_id} | 一起来和鼠鼠们分享新鲜事`,
        link: 'https://web.shuhole.cn/##' + thread_id,
        imgUrl: 'https://static.r-ay.cn/shuhole.png',
      });
      wx.updateAppMessageShareData({
        title: `鼠洞 #${thread_id} | 一起来和鼠鼠们分享新鲜事`,
        desc: `#${thread_id}: ${info.text || '在鼠洞，畅所欲言。'}`,
        link: 'https://web.shuhole.cn/##' + thread_id,
        imgUrl: 'https://static.r-ay.cn/shuhole.png',
      });
      if (window.chargingSource)
        window.chargingSource.postMessage(
          {
            type: 'thread',
            id: thread_id,
            info,
          },
          'https://charging.shuhole.cn',
        );
      else
        wx.miniProgram.postMessage({
          data: {
            type: 'shuhole-thread',
            id: thread_id,
            info,
          },
        });
    }
    this.setState((prevState) => {
      let ns = prevState.sidebar_stack.slice();
      if (mode === 'push') {
        if (ns.length === 1) {
          document.body.style.top = `-${window.scrollY}px`;
          document.body.style.position = 'fixed';
          document.body.style.width = '100vw'; // Be responsive with fixed position
        }
        if (ns.length > MAX_SIDEBAR_STACK_SIZE) ns.splice(1, 1);
        ns = ns.concat([[title, content]]);
      } else if (mode === 'pop') {
        if (ns.length === 1) return;
        if (ns.length === 2) {
          const scrollY = document.body.style.top;
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.width = '';
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
        ns.pop();
      } else if (mode === 'replace') {
        ns.pop();
        ns = ns.concat([[title, content]]);
      } else if (mode === 'clear') {
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
        ns = [[null, null]];
      } else throw new Error('bad show_sidebar mode');
      return {
        sidebar_stack: ns,
      };
    });
  }

  set_mode(mode, search_text) {
    this.setState({
      mode: mode,
      search_text: search_text,
      flow_render_key: +new Date(),
    });
  }

  render() {
    const wechat = sessionStorage.getItem('LOGINVIAWECHAT');
    return (
      <PulldownRefresh
        enable={this.state.sidebar_stack.length === 1}
        test={this.state.sidebar_stack}
        handleRefresh={() => {
          return new Promise((resolve) => {
            this.set_mode(this.state.mode, this.state.search_text);
            this.setState({
              loaded_callback: () => resolve(),
            });
          });
        }}
      >
        <TokenCtx.Provider
          value={{
            value: this.state.token,
            set_value: (x) => {
              localStorage['TOKEN'] = x || '';
              this.setState({
                token: x,
              });
            },
          }}
        >
          <PressureHelper callback={this.on_pressure_bound} />
          <div className="bg-img" style={bgimg_style()} />
          <Title
            show_sidebar={this.show_sidebar_bound}
            set_mode={this.set_mode_bound}
            mode={this.state.mode}
          />
          <div style={{ width: '100%', height: '60px' }} />
          <TokenCtx.Consumer>
            {(token) => (
              <div className="left-container">
                <DeprecatedAlert token={token.value} />
                {!token.value && (
                  <div className="flow-item-row aux-margin">
                    <div className="box box-tip">
                      <p>
                        {wechat ? (
                          <ScanCodePopup token_callback={token.set_value}>
                            {(do_popup) => (
                              <a onClick={do_popup}>
                                <span className="icon icon-login" />
                                &nbsp;进行鼠鼠身份验证
                              </a>
                            )}
                          </ScanCodePopup>
                        ) : (
                          <LoginPopup token_callback={token.set_value}>
                            {(do_popup) => (
                              <a onClick={do_popup}>
                                <span className="icon icon-login" />
                                &nbsp;登录到 {process.env.REACT_APP_TITLE}
                              </a>
                            )}
                          </LoginPopup>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {needShowSuicidePrompt(this.state.search_text) &&
                  !this.state.override_suicide && (
                    <div className="flow-item-row">
                      <div className="flow-item box box-tip">
                        <p style={{ textAlign: 'left' }}>需要帮助？</p>
                        <p style={{ textAlign: 'left' }}>
                          北京24小时心理援助热线：
                          <a href="tel:01082951332">010-8295-1332</a>
                        </p>
                        <p style={{ textAlign: 'left' }}>
                          希望24小时热线：
                          <a href="tel:4001619995">400-161-9995</a>
                        </p>
                        <hr />
                        <p>
                          <button
                            onClick={() => {
                              window.location.href =
                                'https://www.zhihu.com/question/25082178/answer/106073121';
                            }}
                          >
                            了解更多
                          </button>
                          &nbsp; &nbsp; &nbsp;
                          <button
                            onClick={() => {
                              this.setState({
                                override_suicide: true,
                              });
                            }}
                          >
                            展示结果
                          </button>
                        </p>
                      </div>
                    </div>
                  )}
                {this.inshu_flag || token.value ? (
                  (this.state.override_suicide ||
                    !needShowSuicidePrompt(this.state.search_text)) && (
                    <SwitchTransition mode="out-in">
                      <CSSTransition
                        key={this.state.flow_render_key}
                        timeout={100}
                        classNames="flows-anim"
                      >
                        <Flow
                          key={this.state.flow_render_key}
                          show_sidebar={this.show_sidebar_bound}
                          mode={this.state.mode}
                          search_text={this.state.search_text}
                          token={token.value}
                          loaded_callback={this.state.loaded_callback}
                        />
                      </CSSTransition>
                    </SwitchTransition>
                  )
                ) : wechat ? (
                  <TitleLine text="完成身份验证或连接校园网后访问鼠洞" />
                ) : (
                  <TitleLine text="请登录或使用校园网访问鼠洞" />
                )}
                <br />
              </div>
            )}
          </TokenCtx.Consumer>
          <Sidebar
            show_sidebar={this.show_sidebar_bound}
            stack={this.state.sidebar_stack}
          />
        </TokenCtx.Provider>
      </PulldownRefresh>
    );
  }
}

export default App;
