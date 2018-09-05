const Applet = imports.ui.applet;
const PopupMenu = imports.ui.popupMenu;
const Settings = imports.ui.settings;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Main = imports.ui.main;
const Lang = imports.lang;
const AppRoot = imports.ui.appletManager.appletMeta['noteon@jetpirate'].path;
const CurrentVersion = imports.ui.appletManager.appletMeta['noteon@jetpirate'].version;
const Mainloop = imports.mainloop;
const Tweener = imports.ui.tweener;
const Soup = imports.gi.Soup;
const _httpSession = new Soup.Session();

function MyApplet(orientation, panel_height, instance_id) {
  this._init(orientation, panel_height, instance_id);
}

MyApplet.prototype = {
  __proto__: Applet.TextIconApplet.prototype,

  _init: function(orientation, panel_height, instance_id) {
    Applet.TextIconApplet.prototype._init.call(this, orientation, panel_height, instance_id);

    this.menuManager = new PopupMenu.PopupMenuManager(this);
    this.menu = new Applet.AppletPopupMenu(this, orientation);
    this.menuManager.addMenu(this.menu);

    this.settings = new Settings.AppletSettings(this, "noteon@jetpirate", instance_id);

    this.settings.bind("icon-name", "icon_name", this.settings_changed_callback);
    this.settings.bind("use-custom-label",  "use_custom_label", this.settings_changed_callback);
    this.settings.bind("custom-label", "custom_label", this.settings_changed_callback);
    this.settings.bind("background-color", "background_color", this.settings_changed_callback);
    this.settings.bind("notification-color", "notification_color", this.settings_changed_callback);
    this.settings.bind("spinner-number", "spinner_number", this.settings_changed_callback);
    this.settings.bind("save-file", "save_file", this.save_file_changed_callback);
    this.settings.bind("file-editor", "file_editor", this.settings_changed_callback);

    if (GLib.file_test(this.get_stash_file_path(), GLib.FileTest.EXISTS)) {
      this.save_file = GLib.file_get_contents(this.get_stash_file_path())[1].toString();
    } else {
      // Show help by default
      this.save_file = "file///" + AppRoot + "/README";
    }

    this.save_file_content = new PopupMenu.PopupMenuItem("");
    this.save_file_content.label.clutter_text.set_editable(true);
    this.save_file_content.label.clutter_text.set_activatable(true);
    this.save_file_content.label.clutter_text.set_reactive(true);
    this.menu.addMenuItem(this.save_file_content);

    this.command_open = new PopupMenu.PopupMenuItem("OPEN");
    this.command_open.connect("activate", Lang.bind(this, this.command_open_callback));
    this.menu.addMenuItem(this.command_open);

    this.command_save = new PopupMenu.PopupMenuItem("SAVE");
    this.command_save.connect("activate", Lang.bind(this, this.command_save_callback));
    this.menu.addMenuItem(this.command_save);

    this.settings_changed_callback();
  },
  save_file_changed_callback: function() {
    GLib.file_set_contents(this.get_stash_file_path(), this.save_file);
    this.update_save_file();
  },
  settings_changed_callback: function() {
    if (this.use_custom_label) {
      this.set_applet_label(this.custom_label);
    } else {
      this.set_applet_label("~hello there~");
    }

    let icon_file = Gio.File.new_for_path(this.icon_name);
    if (icon_file.query_exists(null)) {
      this.set_applet_icon_path(this.icon_name);
    } else {
      this.set_applet_icon_name(this.icon_name);
    }

    this.update_save_file();
    this.actor.style = "background-color:" + this.background_color + "; width:" + this.spinner_number + "px";
  },
  on_applet_clicked: function(event) {
    this.update_save_file();
    this.menu.toggle();
  },
  on_applet_removed_from_panel: function() {
    this.settings.finalize();
  },
  update_save_file: function() {
    if (GLib.file_test(this.get_save_file_path(), GLib.FileTest.EXISTS)) {
      this.save_file_content.label.clutter_text.set_text(GLib.file_get_contents(this.get_save_file_path())[1].toString());
    } else {
      this.save_file_content.label.clutter_text.set_text("Choose a file in applet settings.");
    }
  },
  get_save_file_path: function() {
    return this.save_file.substring(6);
  },
  get_stash_file_path: function() {
    return AppRoot + "/stash";
  },
  command_open_callback: function() {
    Main.Util.spawnCommandLine(this.file_editor + " " + this.get_save_file_path());
  },
  command_save_callback: function() {
    GLib.file_set_contents(this.get_save_file_path(), this.save_file_content.label.clutter_text.get_text());
  },
  check_updates_callback: function() {
    var answer = "";
    var message = Soup.Message.new('GET', 'https://api.github.com/repos/JetPirate/noteon/releases');
    _httpSession.user_agent = 'cinnamon';
    _httpSession.send_message(message);
    response = JSON.parse(message.response_body.data);
    last_version = response[0]["tag_name"];
    if (last_version > CurrentVersion) {
      answer = " ~new version (" + last_version + ") is available!~";
    } else {
      answer = " ~already latest!~";
    }
    this.actor.style = "background-color:" + this.notification_color + "; width:" + (answer.length * 10) + "px";
    this.set_applet_label(answer);

    var timeoutId = Mainloop.timeout_add(3000, Lang.bind(this, function() {
      this.settings_changed_callback();
    }));

    Tweener.addTween(this._applet_icon, {
      margin_left: 10,
      time: 0.5,
      transition: "easeInSine",
      onComplete: function() {
        Tweener.addTween(this._applet_icon, {
          margin_left: 0,
          time: 0.5,
          transition: "easeInSine"
        });
      },
      onCompleteScope: this
    });
  }
};

function main(metadata, orientation, panel_height, instance_id) {
  return new MyApplet(orientation, panel_height, instance_id);
}
