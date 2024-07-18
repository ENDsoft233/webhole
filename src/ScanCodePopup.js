import * as React from 'react';
import { get_json } from './old_infrastructure/functions';

export class ScanCodePopup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      popup_show: false,
      qrcode: null,
    };
    this.on_popup_bound = this.on_popup.bind(this);
    this.on_close_bound = this.on_close.bind(this);
    fetch('https://charging-api.ruivon.cn/v1/getwxqrcode/shuhole_identify')
      .then(get_json)
      .then((data) => {
        this.setState({
          qrcode: `https://mp.weixin.qq.com/cgi-bin/showqrcode?ticket=${data.ticket}`,
        });
      });
  }

  on_popup() {
    this.setState({
      popup_show: true,
    });
  }

  on_close() {
    this.setState({
      popup_show: false,
    });
  }

  render() {
    return (
      <React.Fragment>
        {this.props.children(this.on_popup_bound)}
        {this.state.popup_show && (
          <div>
            <div className="treehollow-login-popup-shadow" />
            <div className="treehollow-login-popup margin-popup">
              {this.state.qrcode ? (
                <div>
                  <p>长按二维码关注公众号以进一步操作</p>
                  <img
                    src={this.state.qrcode}
                    style={{
                      width: '100%',
                      height: 'auto',
                      borderRadius: '5px',
                    }}
                  />
                </div>
              ) : (
                <p>处理中..</p>
              )}
              <p>
                <button onClick={this.on_close.bind(this)}>取消</button>
              </p>
            </div>
          </div>
        )}
      </React.Fragment>
    );
  }
}
