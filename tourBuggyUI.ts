import * as hz from 'horizon/core';
import * as ui from 'horizon/ui';
import { TourControlEvent } from './tourBuggyEvents';

class TourBuggyUI extends ui.UIComponent<typeof TourBuggyUI> {
  static propsDefinition = {
    // Optional: start in running mode
    startRunning: { type: hz.PropTypes.Boolean, default: false },
    // Optional: text labels
    startLabel: { type: hz.PropTypes.String, default: 'Start Buggy' },
    stopLabel: { type: hz.PropTypes.String, default: 'Stop Buggy' },
    // Target buggy entity to send events to
    buggy: { type: hz.PropTypes.Entity },
  };

  private running = new ui.Binding<boolean>(false);

  start() {
    // Initialize state
    this.running.set(!!this.props.startRunning);
  }

  initializeUI(): ui.UINode {
    const label = this.running.derive(isOn => (isOn ? this.props.stopLabel ?? 'Stop Buggy' : this.props.startLabel ?? 'Start Buggy'));
    const bgColor = this.running.derive(isOn => (isOn ? '#d9534f' /* red */ : '#28a745' /* green */));

    return ui.View({
      style: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0)',
      },
      children: ui.Pressable({
        onClick: (player) => this.onToggle(player),
        style: {
          width: 360,
          height: 120,
          borderRadius: 24,
          backgroundColor: bgColor,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        },
        children: ui.Text({
          text: label,
          style: {
            color: '#ffffff',
            fontSize: 42,
            fontWeight: 'bold',
          },
        }),
      }),
    });
  }

  private onToggle(player: hz.Player) {
    // Toggle and broadcast based on the new value without reading internals
    let newVal = false;
    this.running.set(prev => {
      newVal = !prev;
      return newVal;
    }, [player]);

    // Send event to specific buggy entity if wired, otherwise broadcast globally
    const targetBuggy = this.props.buggy;
    if (targetBuggy) {
      this.sendLocalBroadcastEvent(TourControlEvent, {
        action: newVal ? 'start' : 'stop',
        pause: !newVal,
        targetEntityId: targetBuggy.id
      });
      console.log('TourBuggyUI: Toggled ->', newVal ? 'start' : 'stop', 'for buggy:', targetBuggy.name);
    } else {
      this.sendLocalBroadcastEvent(TourControlEvent, {
        action: newVal ? 'start' : 'stop',
        pause: !newVal
      });
      console.log('TourBuggyUI: Toggled ->', newVal ? 'start' : 'stop', '(broadcast to all)');
    }
  }
}

hz.Component.register(TourBuggyUI);
