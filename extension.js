'use strict';

const Main = imports.ui.main;
const Mainloop = imports.mainloop;

const St = imports.gi.St;
const PanelMenu = imports.ui.panelMenu;
const Clutter = imports.gi.Clutter;
const GLib = imports.gi.GLib;
const ShellToolkit = imports.gi.St;
const GObject = imports.gi.GObject;

// Start with WAN address as default
var type=4;

function _get_vpn0() {

    try {

      var command_output_bytes = GLib.spawn_command_line_sync('ip route list dev vpn0')[1];
      var command_output_string = '';

      for (var current_character_index = 0;
          current_character_index < command_output_bytes.length;
          ++current_character_index)
      {
          var current_character = String.fromCharCode(command_output_bytes[current_character_index]);
          command_output_string += current_character;
      }

      var Re = new RegExp(/src [^ ]+/g);
      var matches = command_output_string.match(Re);
      var ipAddress;
      if (matches) {
          ipAddress = matches[0].split(' ')[1];
      } else {
          ipAddress = 'Disconnected';
      }

    } catch (e) {
      ipAddress='Disconnected';
    }


    return ipAddress;

}

function _get_anyConn() {

    try {

      var command_output_bytes = GLib.spawn_command_line_sync('ip route list dev cscotun0')[1];
      var command_output_string = '';

      for (var current_character_index = 0;
          current_character_index < command_output_bytes.length;
          ++current_character_index)
      {
          var current_character = String.fromCharCode(command_output_bytes[current_character_index]);
          command_output_string += current_character;
      }

      var Re = new RegExp(/src [^ ]+/g);
      var matches = command_output_string.match(Re);
      var ipAddress;
      if (matches) {
          ipAddress = matches[0].split(' ')[1];
      } else {
          ipAddress = 'Disconnected';
      }

    } catch (e) {
      ipAddress='Disconnected';
    }


    return ipAddress;

}

function _get_lan_ip4() {
    // Ask the IP stack what route would be used to reach 1.1.1.1 (Cloudflare DNS)
    // Specifically, what src would be used for the 1st hop?
    var command_output_bytes = GLib.spawn_command_line_sync('ip route get 1.1.1.1')[1];
    var command_output_string = '';

    for (var current_character_index = 0;
        current_character_index < command_output_bytes.length;
        ++current_character_index)
    {
        var current_character = String.fromCharCode(command_output_bytes[current_character_index]);
        command_output_string += current_character;
    }

    // Output of the "ip route" command will be a string
    // " ... src 1.2.3.4 ..."
    // So basically we want the next token (word) immediately after the "src"
    // word, and nothing else. This is considerd our LAN IP address.
    var Re = new RegExp(/src [^ ]+/g);
    var matches = command_output_string.match(Re);
    var lanIpAddress;
    if (matches) {
        lanIpAddress = matches[0].split(' ')[1];
    } else {
        lanIpAddress = '';
    }

    return lanIpAddress;
}

function _get_lan_ip6() {
    // Ask the IP stack what route would be used to reach 2001:: (random ipv6 address)
    // Specifically, what src would be used for the 1st hop?
    var command_output_bytes = GLib.spawn_command_line_sync('ip route get 2001::')[1];
    var command_output_string = '';

    for (var current_character_index = 0;
        current_character_index < command_output_bytes.length;
        ++current_character_index)
    {
        var current_character = String.fromCharCode(command_output_bytes[current_character_index]);
        command_output_string += current_character;
    }

    // Output of the "ip route" command will be a string
    // " ... src 2001:xxx:yyy:..."
    // So basically we want the next token (word) immediately after the "src"
    // word, and nothing else. This is considerd our LAN IP address.
    var Re = new RegExp(/src [^ ]+/g);
    var matches = command_output_string.match(Re);
    var lanIpAddress;
    if (matches) {
        lanIpAddress = matches[0].split(' ')[1];
    } else {
        lanIpAddress = '';
    }
    return lanIpAddress;
}

function _get_wan_ip4() {
    // Use the google dns servers to find the publip ip address used for requests
    // Force a ipv4 conection, because ipv6 won't be NAT'ed
    var command_output_bytes = GLib.spawn_command_line_sync('dig TXT +short o-o.myaddr.l.google.com @ns1.google.com -4')[1];
    var command_output_string = '';

    for (var current_character_index = 0;
        current_character_index < command_output_bytes.length;
        ++current_character_index)
    {
        var current_character = String.fromCharCode(command_output_bytes[current_character_index]);
        command_output_string += current_character;
    }
    command_output_string=command_output_string.replace('"','').replace('"','').replace('\n','');
    // Validate the result looks like an ipv4 address
    var Re = new RegExp(/.*\..*\..*\..*/g);
    var matches = command_output_string.match(Re);
    var wanIpAddress;
    if (matches) {
        wanIpAddress = command_output_string;
    } else {
        wanIpAddress = '';
    }
    return wanIpAddress;
}


var AllIPAddressIndicator = class AllIPAddressIndicator extends PanelMenu.Button{

    _init() {
        // Chaining up to the super-class
        super._init(0.0, "All IP Addresses Indicator", false);

        this.buttonText = new St.Label({
            text: 'Loading...',
            y_align: Clutter.ActorAlign.CENTER
        });
        this.add_child(this.buttonText);
        this._updateLabel();
    }

    _updateLabel(){
        const refreshTime = 10 // in seconds

        if (this._timeout) {
                Mainloop.source_remove(this._timeout);
                this._timeout = null;
        }
        this._timeout = Mainloop.timeout_add_seconds(refreshTime, () => {this._updateLabel();});
        // Show the right format. 0=WAN, 1=AnyConnect, 2=VPN, 4=IPv4, 6=IPv6,

        if (type===0) {
          this.buttonText.set_text("WAN > "+_get_wan_ip4());
        } else if (type===1) {
          this.buttonText.set_text("ANY > "+_get_anyConn());
        } else if (type===2) {
	  this.buttonText.set_text("VPN > "+_get_vpn0());
	} else if (type===4) {
          this.buttonText.set_text("LAN > "+_get_lan_ip4());
        } else if (type===6) {
          this.buttonText.set_text("IP6 > "+_get_lan_ip6());
        }
    }

    _removeTimeout() {
        if (this._timeout) {
            this._timeout = null;
        }
    }

    stop() {
        if (this._timeout) {
            Mainloop.source_remove(this._timeout);
        }
        this._timeout = undefined;

        this.menu.removeAll();
    }
}
// In gnome-shell >= 3.32 this class and several others became GObject
// subclasses. We can account for this change simply by re-wrapping our
// subclass in `GObject.registerClass()`
AllIPAddressIndicator = GObject.registerClass(
    {GTypeName: 'AllIPAddressIndicator'},
    AllIPAddressIndicator
);

let _indicator;

function init() {
}

function enable() {
    _indicator = new AllIPAddressIndicator();
    Main.panel.addToStatusArea('all-ip-addresses-indicator', _indicator);
    _indicator.connect('button-press-event', _toggle);
}

function disable() {
    _indicator.stop();
    _indicator.destroy();
    _indicator = null;
}

function _toggle() {
  var aux=-1;
    if (type===0) {
        aux=1;
    } else if (type===1) {
        aux=2;
    } else if (type===2) {
	aux=4;
    } else if (type===4) {
        aux=6;
    } else if (type===6) {
        aux=0;
    }

    type=aux;

    _indicator._updateLabel();
}

