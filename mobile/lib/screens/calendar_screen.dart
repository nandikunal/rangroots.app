import 'package:flutter/material.dart';

class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key});

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  bool showDetails = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Calendar & Muhurta')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Tithi: —'),
            const Text('Paksha: —'),
            const Text('Sunrise / Sunset: — / —'),
            const Text('Today\'s festival: —'),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('More details'),
              value: showDetails,
              onChanged: (v) => setState(() => showDetails = v),
            ),
            if (showDetails) const Text('Nakshatra, Yoga, Karana, Rahu Kaal, Abhijit Muhurta — TODO'),
          ],
        ),
      ),
    );
  }
}
